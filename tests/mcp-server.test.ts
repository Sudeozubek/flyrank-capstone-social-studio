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

  it("lists all seven tools", async () => {
    const response = await handleRpc({ jsonrpc: "2.0", id: 2, method: "tools/list" }, caller);
    const listed = (response?.result as { tools: Array<{ name: string }> }).tools;
    expect(listed).toHaveLength(7);
    expect(listed.map((t) => t.name).sort()).toEqual(tools.map((t) => t.name).sort());
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

  it("returns method not found for unknown methods", async () => {
    const response = await handleRpc(
      { jsonrpc: "2.0", id: 5, method: "unknown/method" },
      caller,
    );
    expect(response?.error?.message).toContain("Method not found");
  });
});
