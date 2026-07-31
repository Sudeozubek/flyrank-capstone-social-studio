/**
 * Minimal, vendor-neutral MCP tool types.
 *
 * This layer depends only on `zod` and the Model Context Protocol wire format —
 * no hosting-provider SDK. Tools are plain objects; the transport lives in
 * `src/routes/api/public/mcp.ts`.
 */

import type { z } from "zod";

export type McpContent = { type: "text"; text: string };

export interface McpToolResult {
  content: McpContent[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

/** Identity resolved from the verified bearer token. */
export interface McpCallerContext {
  userId: string;
  token: string;
}

export interface McpToolAnnotations {
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
}

export interface McpTool<S extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string;
  title: string;
  description: string;
  schema: S;
  annotations?: McpToolAnnotations;
  handler: (input: z.infer<S>, ctx: McpCallerContext) => Promise<McpToolResult>;
}

export function defineTool<S extends z.ZodTypeAny>(tool: McpTool<S>): McpTool<z.ZodTypeAny> {
  return tool as unknown as McpTool<z.ZodTypeAny>;
}
