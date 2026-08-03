/**
 * Supabase Realtime needs WebSocket. Node.js 22+ ships a native global;
 * Node 20 (common in local dev) does not — use the `ws` package instead.
 */

import type { RealtimeClientOptions } from "@supabase/realtime-js";
import WebSocket from "ws";

export function supabaseRealtimeOptions(): { realtime?: RealtimeClientOptions } {
  if (typeof window !== "undefined") return {};
  if (typeof globalThis.WebSocket !== "undefined") return {};

  return {
    realtime: {
      transport: WebSocket as unknown as NonNullable<RealtimeClientOptions["transport"]>,
    },
  };
}
