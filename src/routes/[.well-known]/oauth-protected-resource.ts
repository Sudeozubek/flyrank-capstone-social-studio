/**
 * RFC 9728 protected-resource metadata, so MCP clients can discover the
 * authorization server for /api/public/mcp. Hand-authored and vendor-neutral.
 */

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/.well-known/oauth-protected-resource")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "";
        return new Response(
          JSON.stringify({
            resource: `${origin}/api/public/mcp`,
            authorization_servers: projectRef ? [`https://${projectRef}.supabase.co/auth/v1`] : [],
            bearer_methods_supported: ["header"],
          }),
          {
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
              "Cache-Control": "public, max-age=300",
            },
          },
        );
      },
    },
  },
});
