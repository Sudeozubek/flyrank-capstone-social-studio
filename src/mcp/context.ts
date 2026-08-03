/**
 * Shared plumbing for MCP tools.
 *
 * Builds the *same* AppContext the web/server-function layer builds, from the
 * caller's verified bearer token. No business logic lives here.
 */

import { createClient } from "@supabase/supabase-js";
import { createAppContext } from "@/infrastructure/context.server";
import { supabaseRealtimeOptions } from "@/integrations/supabase/realtime-options.server";
import type { AppContext } from "@/domain/ports";
import type { McpCallerContext, McpToolResult } from "./types";

type RuntimeGlobals = typeof globalThis & {
  Deno?: { env?: { get?: (name: string) => string | undefined } };
  process?: { env?: Record<string, string | undefined> };
};

function runtimeEnv(name: string): string | undefined {
  const runtime = globalThis as RuntimeGlobals;
  return runtime.Deno?.env?.get?.(name) ?? runtime.process?.env?.[name];
}

function configuredEnv(names: readonly string[]): string | undefined {
  for (const name of names) {
    const value = runtimeEnv(name)?.trim();
    if (value) return value;
  }
  return undefined;
}

export function supabaseProjectUrl(): string {
  const url = configuredEnv(["SUPABASE_URL", "VITE_SUPABASE_URL"]);
  if (!url) throw new Error("SUPABASE_URL (or VITE_SUPABASE_URL) is required");
  return url;
}

export function supabasePublishableKey(): string {
  const direct = configuredEnv(["SUPABASE_PUBLISHABLE_KEY", "VITE_SUPABASE_PUBLISHABLE_KEY"]);
  if (direct) return direct;

  const keyset = runtimeEnv("SUPABASE_PUBLISHABLE_KEYS");
  if (keyset) {
    try {
      const parsed: unknown = JSON.parse(keyset);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const keys = parsed as Record<string, unknown>;
        const key = [keys['default'], ...Object.values(keys)]
          .find((v): v is string => typeof v === "string" && v.trim().startsWith("sb_publishable_"))
          ?.trim();
        if (key) return key;
      }
    } catch {
      // fall through to the legacy names below
    }
  }

  const legacy = configuredEnv(["SUPABASE_ANON_KEY", "VITE_SUPABASE_ANON_KEY"]);
  if (legacy) return legacy;
  throw new Error("SUPABASE_PUBLISHABLE_KEY, SUPABASE_PUBLISHABLE_KEYS, or SUPABASE_ANON_KEY is required");
}

/** Request-scoped client carrying the caller's token, so RLS applies as them. */
export function supabaseForUser(token: string) {
  return createClient(supabaseProjectUrl(), supabasePublishableKey(), {
    ...supabaseRealtimeOptions(),
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Verifies a bearer token against the auth server and resolves the caller. */
export async function resolveCaller(token: string): Promise<McpCallerContext | null> {
  const client = supabaseForUser(token);
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;
  return { userId: data.user.id, token };
}

export function appContextFor(ctx: McpCallerContext): AppContext {
  return createAppContext(supabaseForUser(ctx.token) as never, ctx.userId);
}

export function jsonResult(payload: unknown): McpToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
    structuredContent: payload as Record<string, unknown>,
  };
}

export function errorResult(error: unknown): McpToolResult {
  return {
    content: [{ type: "text", text: error instanceof Error ? error.message : String(error) }],
    isError: true,
  };
}

/** Wraps a tool body so use-case failures surface as MCP tool errors. */
export async function withApp<T>(
  ctx: McpCallerContext,
  run: (app: AppContext) => Promise<T>,
): Promise<McpToolResult> {
  try {
    return jsonResult(await run(appContextFor(ctx)));
  } catch (error) {
    return errorResult(error);
  }
}
