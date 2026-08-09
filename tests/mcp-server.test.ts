import { describe, expect, it } from "vitest";
import { handleRpc, MCP_PROTOCOL_VERSION, tools } from "@/mcp/server";
import type { McpCallerContext } from "@/mcp/types";

const caller: McpCallerContext = { userId: "user-1", token: "test-token" };

describe("MCP JSON-RPC server", () => {
  it("responds to initialize with protocol version and capabilities", async () => {
    const response = await handleRpc({ jsonrpc: "2.0", id: 1, method: "initialize" }, caller);
    expect(response?.result).toMatchObject({
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: "campaignhub-studio" },
    });
  });

  it("returns null for notifications", async () => {
    const response = await handleRpc(
      { jsonrpc: "2.0", method: "notifications/initialized" },
      caller,
    );
    expect(response).toBeNull();
  });

  it("lists every registered tool with a JSON Schema", async () => {
    const response = await handleRpc({ jsonrpc: "2.0", id: 2, method: "tools/list" }, caller);
    const listed = (
      response?.result as {
        tools: Array<{ name: string; inputSchema: { type: string } }>;
      }
    ).tools;
    expect(listed).toHaveLength(tools.length);
    expect(listed.map((t) => t.name).sort()).toEqual(tools.map((t) => t.name).sort());
    expect(listed.every((t) => t.inputSchema.type === "object")).toBe(true);
  });

  it("exposes a post-discovery tool so create_campaign is reachable", async () => {
    // create_campaign needs a postId; without a listing tool an MCP client has
    // no way to obtain one.
    expect(tools.map((t) => t.name)).toContain("list_posts");
  });

  it("returns an error for unknown tools", async () => {
    const response = await handleRpc(
      {
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: { name: "nonexistent_tool", arguments: {} },
      },
      caller,
    );
    expect(response?.error?.message).toContain("Unknown tool");
  });

  it("returns validation errors for invalid tool arguments", async () => {
    const response = await handleRpc(
      {
        jsonrpc: "2.0",
        id: 4,
        method: "tools/call",
        params: { name: "create_campaign", arguments: {} },
      },
      caller,
    );
    const result = response?.result as { isError?: boolean; content: Array<{ text: string }> };
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain("Invalid arguments");
  });

  it("rejects a non-ISO scheduledFor at the schema boundary", async () => {
    const response = await handleRpc(
      {
        jsonrpc: "2.0",
        id: 6,
        method: "tools/call",
        params: {
          name: "schedule_campaign",
          arguments: {
            campaignId: "00000000-0000-4000-8000-000000000000",
            scheduledFor: "next tuesday",
          },
        },
      },
      caller,
    );
    const result = response?.result as { isError?: boolean; content: Array<{ text: string }> };
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain("Invalid arguments");
  });

  it("echoes a protocol version it supports and falls back otherwise", async () => {
    const older = await handleRpc(
      { jsonrpc: "2.0", id: 7, method: "initialize", params: { protocolVersion: "2024-11-05" } },
      caller,
    );
    expect((older?.result as { protocolVersion: string }).protocolVersion).toBe("2024-11-05");

    const unknown = await handleRpc(
      { jsonrpc: "2.0", id: 8, method: "initialize", params: { protocolVersion: "1999-01-01" } },
      caller,
    );
    expect((unknown?.result as { protocolVersion: string }).protocolVersion).toBe(
      MCP_PROTOCOL_VERSION,
    );
  });

  it("returns method not found for unknown methods", async () => {
    const response = await handleRpc({ jsonrpc: "2.0", id: 5, method: "unknown/method" }, caller);
    expect(response?.error?.message).toContain("Method not found");
  });
});
