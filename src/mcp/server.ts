/**
 * CampaignHub MCP server — framework-independent.
 *
 * Implements the Model Context Protocol JSON-RPC surface (initialize,
 * tools/list, tools/call) over any transport. The HTTP transport lives in
 * `src/routes/api/public/mcp.ts`. Every tool delegates to the same application
 * use cases the web UI calls; no business logic lives in this layer.
 */

import { zodToJsonSchema } from "zod-to-json-schema";
import campaignStatusTool from "./tools/campaign-status";
import createCampaignTool from "./tools/create-campaign";
import getCampaignTool from "./tools/get-campaign";
import listCampaignsTool from "./tools/list-campaigns";
import publishCampaignTool from "./tools/publish-campaign";
import retryCampaignTool from "./tools/retry-campaign";
import scheduleCampaignTool from "./tools/schedule-campaign";
import type { McpCallerContext, McpTool } from "./types";

export const MCP_PROTOCOL_VERSION = "2025-06-18";

export const serverInfo = {
  name: "campaignhub-studio",
  title: "CampaignHub Studio",
  version: "1.0.0",
} as const;

export const instructions =
  "Remote control for CampaignHub Studio. Campaigns turn a blog post into platform-native captions and image variants, then publish through a durable, idempotent pipeline. Use `list_campaigns` to browse, `get_campaign` for full detail, `create_campaign` with an existing postId to build a new one, `schedule_campaign` / `publish_campaign` to deliver, `retry_campaign` after a failure, and `campaign_status` to poll delivery. All tools act as the signed-in user and only see that user's data.";

export const tools: McpTool[] = [
  createCampaignTool,
  listCampaignsTool,
  getCampaignTool,
  campaignStatusTool,
  scheduleCampaignTool,
  publishCampaignTool,
  retryCampaignTool,
];

const toolsByName = new Map(tools.map((tool) => [tool.name, tool]));

export function toolDescriptors() {
  return tools.map((tool) => ({
    name: tool.name,
    title: tool.title,
    description: tool.description,
    inputSchema: zodToJsonSchema(tool.schema, { target: "jsonSchema7", $refStrategy: "none" }),
    ...(tool.annotations ? { annotations: tool.annotations } : {}),
  }));
}

export type JsonRpcRequest = {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
};

export type JsonRpcResponse = {
  jsonrpc: "2.0";
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string };
};

function ok(id: string | number | null, result: unknown): JsonRpcResponse {
  return { jsonrpc: "2.0", id, result };
}

function fail(id: string | number | null, code: number, message: string): JsonRpcResponse {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

/**
 * Handles one JSON-RPC message. Returns `null` for notifications, which take
 * no response body (HTTP 202 at the transport layer).
 */
export async function handleRpc(
  message: JsonRpcRequest,
  caller: McpCallerContext,
): Promise<JsonRpcResponse | null> {
  const id = message.id ?? null;
  const method = message.method ?? "";

  if (method.startsWith("notifications/")) return null;

  switch (method) {
    case "initialize":
      return ok(id, {
        protocolVersion: MCP_PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo,
        instructions,
      });

    case "ping":
      return ok(id, {});

    case "tools/list":
      return ok(id, { tools: toolDescriptors() });

    case "tools/call": {
      const name = String(message.params?.['name'] ?? "");
      const tool = toolsByName.get(name);
      if (!tool) return fail(id, -32602, `Unknown tool: ${name}`);

      const parsed = tool.schema.safeParse(message.params?.['arguments'] ?? {});
      if (!parsed.success) {
        return ok(id, {
          content: [{ type: "text", text: `Invalid arguments: ${parsed.error.message}` }],
          isError: true,
        });
      }

      try {
        return ok(id, await tool.handler(parsed.data, caller));
      } catch (error) {
        return ok(id, {
          content: [
            { type: "text", text: error instanceof Error ? error.message : String(error) },
          ],
          isError: true,
        });
      }
    }

    default:
      return fail(id, -32601, `Method not found: ${method}`);
  }
}
