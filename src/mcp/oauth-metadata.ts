/**
 * RFC 9728 protected-resource metadata for `/api/public/mcp`, shared by both
 * well-known routes (root and path-suffixed) so the two can never drift.
 */

export function protectedResourceMetadataBody(origin: string, projectRef: string) {
  return {
    resource: `${origin}/api/public/mcp`,
    authorization_servers: projectRef ? [`https://${projectRef}.supabase.co/auth/v1`] : [],
    bearer_methods_supported: ["header"],
    resource_documentation: `${origin}/`,
  };
}

export function protectedResourceMetadata(request: Request): Response {
  const origin = new URL(request.url).origin;
  const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "";
  return new Response(JSON.stringify(protectedResourceMetadataBody(origin, projectRef)), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=300",
    },
  });
}
