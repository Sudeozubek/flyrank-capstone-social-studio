/**
 * MCP Streamable HTTP transport (stateless).
 *
 * Vendor-neutral: any MCP client (Claude Desktop, ChatGPT, Cursor, custom)
 * can POST JSON-RPC here with an `Authorization: Bearer <access token>` header.
 * The route lives under /api/public/* so external clients are not blocked by
 * the site auth gate; the handler itself verifies every caller.
 */

import { createFileRoute } from "@tanstack/react-router";
import { resolveCaller } from "@/mcp/context";
import { handleRpc, type JsonRpcRequest, type JsonRpcResponse } from "@/mcp/server";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, content-type, mcp-protocol-version, mcp-session-id",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Expose-Headers": "mcp-session-id",
};

/** One request must not fan out into unbounded use-case work. */
const MAX_BATCH_MESSAGES = 50;

/**
 * A browser page on an attacker's origin can POST here with the user's token
 * only if it obtained one, but a DNS-rebinding client aimed at a local server
 * cannot: same-origin and non-browser callers (no Origin header) pass, any
 * other site is refused. The MCP spec calls for this on HTTP transports.
 */
function originAllowed(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function unauthorized(request: Request) {
  const resource = new URL("/api/public/mcp", request.url).toString();
  return new Response(JSON.stringify({ error: "unauthorized" }), {
    status: 401,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "WWW-Authenticate": `Bearer realm="CampaignHub", resource_metadata="${new URL("/.well-known/oauth-protected-resource", request.url).toString()}"`,
      "X-MCP-Resource": resource,
    },
  });
}

export const Route = createFileRoute("/api/public/mcp")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),

      // Streamable HTTP allows a GET SSE stream; this server is stateless and
      // pushes nothing, so it declines the stream explicitly.
      GET: async () => new Response("Method Not Allowed", { status: 405, headers: corsHeaders }),

      POST: async ({ request }) => {
        if (!originAllowed(request)) {
          return json({ error: "forbidden_origin" }, 403);
        }

        const header = request.headers.get("authorization") ?? "";
        const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
        if (!token) return unauthorized(request);

        const caller = await resolveCaller(token);
        if (!caller) return unauthorized(request);

        let payload: unknown;
        try {
          payload = await request.json();
        } catch {
          return json(
            { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } },
            400,
          );
        }

        const messages = (Array.isArray(payload) ? payload : [payload]) as JsonRpcRequest[];
        if (messages.length > MAX_BATCH_MESSAGES) {
          return json(
            {
              jsonrpc: "2.0",
              id: null,
              error: {
                code: -32600,
                message: `Batch too large: ${messages.length} messages (max ${MAX_BATCH_MESSAGES})`,
              },
            },
            400,
          );
        }

        // Sequential: a batch may mix reads with publish/retry, and those must
        // observe each other's writes in the order the client sent them.
        const responses: JsonRpcResponse[] = [];
        for (const message of messages) {
          const response = await handleRpc(message, caller);
          if (response) responses.push(response);
        }

        if (responses.length === 0)
          return new Response(null, { status: 202, headers: corsHeaders });
        return json(Array.isArray(payload) ? responses : responses[0]);
      },
    },
  },
});
