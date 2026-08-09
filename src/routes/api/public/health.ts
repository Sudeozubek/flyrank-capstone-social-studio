/**
 * Health probe — Postgres (via Supabase) and Redis connectivity for Docker / reviewers.
 */

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      GET: async () => {
        let postgres = false;
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { error } = await supabaseAdmin.from("profiles").select("id").limit(1);
          postgres = !error;
        } catch {
          postgres = false;
        }

        const { redisHealth } = await import("@/infrastructure/redis/redis.server");
        const redis = await redisHealth();

        const ok = postgres;
        return Response.json(
          {
            ok,
            services: {
              postgres,
              redis: process.env["REDIS_URL"] ? redis : null,
            },
          },
          { status: ok ? 200 : 503 },
        );
      },
    },
  },
});
