/** Serves a rendered platform image variant at exact platform dimensions. */
import { createFileRoute } from "@tanstack/react-router";
import { isPlatform } from "@/config/platform-specs";
import { renderVariantSvg } from "@/lib/image-variants";

export const Route = createFileRoute("/api/image/variant")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const platform = url.searchParams.get("platform") ?? "";
        if (!isPlatform(platform)) return new Response("unknown platform", { status: 400 });

        const svg = renderVariantSvg(platform, {
          title: (url.searchParams.get("title") ?? "FlyRank").slice(0, 120),
          seed: url.searchParams.get("seed") ?? "flyrank",
          showGuides: url.searchParams.get("guides") === "1",
        });

        return new Response(svg, {
          headers: {
            "content-type": "image/svg+xml; charset=utf-8",
            "cache-control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
