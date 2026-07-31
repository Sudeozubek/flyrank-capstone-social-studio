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
import { handleRpc, type JsonRpcRequest } from "@/mcp/server";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, mcp-protocol-version, mcp-session-id",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Expose-Headers": "mcp-session-id",
};

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
        const header = request.headers.get("authorization") ?? "";
        const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
        if (!token) return unauthorized(request);

        const caller = await resolveCaller(token);
        if (!caller) return unauthorized(request);

        let payload: unknown;
        try {
          payload = await request.json();
        } catch {
          return json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, 400);
        }

        const messages = (Array.isArray(payload) ? payload : [payload]) as JsonRpcRequest[];
        const responses = (await Promise.all(messages.map((m) => handleRpc(m, caller)))).filter(
          (r): r is NonNullable<typeof r> => r !== null,
        );

        if (responses.length === 0) return new Response(null, { status: 202, headers: corsHeaders });
        return json(Array.isArray(payload) ? responses : responses[0]);
      },
    },
  },
});
