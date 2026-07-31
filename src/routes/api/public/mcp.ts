/**
 * OPTIONAL — read-only MCP server (JSON-RPC 2.0 over HTTP).
 * Observability only: no publish/write tools. Thin wrapper over the store.
 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getCampaign, listCampaigns } from "@/lib/campaign.server";
import { db } from "@/lib/store.server";

const TOOLS = [
  {
    name: "list_campaigns",
    description: "Recent campaigns with per-platform status.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_campaign_status",
    description: "Per-platform status for one blog post id.",
    inputSchema: {
      type: "object",
      properties: { postId: { type: "string" } },
      required: ["postId"],
      additionalProperties: false,
    },
  },
  {
    name: "get_webhook_log",
    description: "Last N delivery-webhook events for a post (debugging).",
    inputSchema: {
      type: "object",
      properties: { postId: { type: "string" }, limit: { type: "number" } },
      required: ["postId"],
      additionalProperties: false,
    },
  },
];

const rpcSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.union([z.string(), z.number()]).nullish(),
  method: z.string(),
  params: z.record(z.unknown()).optional(),
});

function text(payload: unknown) {
  return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] };
}

function callTool(name: string, args: Record<string, unknown>) {
  switch (name) {
    case "list_campaigns":
      return text(
        listCampaigns().map((c) => ({
          postId: c.post.id,
          title: c.post.title,
          entries: c.entries.map((e) => ({ platform: e.platform, status: e.status })),
        })),
      );
    case "get_campaign_status": {
      const campaign = getCampaign(String(args["postId"]));
      if (!campaign) return text({ error: "not_found" });
      return text(
        campaign.entries.map((e) => ({
          platform: e.platform,
          status: e.status,
          scheduledFor: e.scheduledFor ?? null,
          publishedAt: e.publishedAt ?? null,
          error: e.error ?? null,
        })),
      );
    }
    case "get_webhook_log": {
      const limit = Number(args["limit"] ?? 10);
      return text(db().webhookLog.filter((w) => w.postId === String(args["postId"])).slice(0, limit));
    }
    default:
      return text({ error: `unknown tool: ${name}` });
  }
}

export const Route = createFileRoute("/api/public/mcp")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const parsed = rpcSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) {
          return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "invalid" } });
        }
        const { id = null, method, params = {} } = parsed.data;
        const reply = (result: unknown) => Response.json({ jsonrpc: "2.0", id, result });

        if (method === "initialize") {
          return reply({
            protocolVersion: "2024-11-05",
            capabilities: { tools: {} },
            serverInfo: { name: "flyrank-campaigns", version: "1.0.0" },
          });
        }
        if (method === "tools/list") return reply({ tools: TOOLS });
        if (method === "tools/call") {
          const name = String(params["name"] ?? "");
          return reply(callTool(name, (params["arguments"] as Record<string, unknown>) ?? {}));
        }
        return Response.json({
          jsonrpc: "2.0",
          id,
          error: { code: -32601, message: `method not found: ${method}` },
        });
      },
    },
  },
});
