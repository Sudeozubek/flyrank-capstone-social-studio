/**
 * Shared plumbing for MCP tools.
 *
 * Every tool resolves the caller through the verified OAuth token and builds
 * the *same* AppContext the REST/server-function layer builds. No business
 * logic lives here — only authentication wiring and result formatting.
 */

import type { ToolContext } from "@lovable.dev/mcp-js";
import { createAppContext } from "@/infrastructure/context.server";
import type { AppContext } from "@/domain/ports";
import { supabaseForUser } from "./supabase";

export function appContextFor(ctx: ToolContext): AppContext {
  if (!ctx.isAuthenticated()) throw new Error("Not authenticated");
  const userId = ctx.getUserId();
  if (!userId) throw new Error("Not authenticated");
  return createAppContext(supabaseForUser(ctx) as never, userId);
}

export function jsonResult(payload: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }],
    structuredContent: payload as Record<string, unknown>,
  };
}

export function errorResult(error: unknown) {
  return {
    content: [
      { type: "text" as const, text: error instanceof Error ? error.message : String(error) },
    ],
    isError: true as const,
  };
}

/** Wraps a tool body so auth/use-case failures surface as MCP tool errors. */
export async function withApp<T>(
  ctx: ToolContext,
  run: (app: AppContext) => Promise<T>,
): Promise<ReturnType<typeof jsonResult> | ReturnType<typeof errorResult>> {
  try {
    return jsonResult(await run(appContextFor(ctx)));
  } catch (error) {
    return errorResult(error);
  }
}
