/**
 * FAKE PLATFORM — OAuth token issuance. Sandbox only; no real provider.
 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { isPlatform } from "@/config/platform-specs";

const bodySchema = z.object({
  platform: z.string().refine(isPlatform, "unknown platform"),
  client_id: z.string().min(1),
  client_secret: z.string().min(1),
  grant_type: z.literal("client_credentials"),
});

export const Route = createFileRoute("/api/public/fake-platform/oauth/token")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const parsed = bodySchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) {
          return Response.json({ error: "invalid_request", details: parsed.error.issues }, { status: 400 });
        }
        return Response.json({
          access_token: `fpt_${parsed.data.platform}_${randomUUID().replace(/-/g, "")}`,
          token_type: "Bearer",
          expires_in: 3600,
          scope: "publish:write",
        });
      },
    },
  },
});
