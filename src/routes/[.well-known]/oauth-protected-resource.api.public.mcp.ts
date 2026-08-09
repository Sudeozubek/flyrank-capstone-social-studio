/**
 * RFC 9728 §3.1 path-suffixed variant: a client discovering the resource
 * `<origin>/api/public/mcp` inserts the resource path after the well-known
 * segment. Clients that skip this and hit the root document get the same
 * metadata from `[.well-known]/oauth-protected-resource.ts`.
 */

import { createFileRoute } from "@tanstack/react-router";
import { protectedResourceMetadata } from "@/mcp/oauth-metadata";

export const Route = createFileRoute("/.well-known/oauth-protected-resource/api/public/mcp")({
  server: {
    handlers: {
      GET: async ({ request }) => protectedResourceMetadata(request),
    },
  },
});
