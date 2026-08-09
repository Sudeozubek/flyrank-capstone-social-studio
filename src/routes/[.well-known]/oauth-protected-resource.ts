/**
 * RFC 9728 protected-resource metadata, so MCP clients can discover the
 * authorization server for /api/public/mcp. Hand-authored and vendor-neutral.
 */

import { createFileRoute } from "@tanstack/react-router";
import { protectedResourceMetadata } from "@/mcp/oauth-metadata";

export const Route = createFileRoute("/.well-known/oauth-protected-resource")({
  server: {
    handlers: {
      GET: async ({ request }) => protectedResourceMetadata(request),
    },
  },
});
