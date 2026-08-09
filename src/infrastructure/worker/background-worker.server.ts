/**
 * Durable scheduler — background tick loop.
 *
 * Polls Postgres for due entries via claim_due_entries (service role) and
 * publishes them without requiring a manual dashboard "tick". Survives restarts
 * because all state lives in the database.
 */

let timer: ReturnType<typeof setInterval> | undefined;

function pollIntervalMs(): number {
  const raw = Number(process.env["WORKER_POLL_INTERVAL_MS"] ?? 10_000);
  return Number.isFinite(raw) && raw >= 1_000 ? raw : 10_000;
}

async function tickOnce(): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { runGlobalWorkerTick } = await import("@/infrastructure/worker/worker-tick.server");
  const baseUrl = process.env["PUBLIC_BASE_URL"]?.trim() || "http://localhost:8080";
  await runGlobalWorkerTick(supabaseAdmin as never, { requestUrl: baseUrl });
}

export function startBackgroundWorker(): void {
  if (process.env["WORKER_ENABLED"] === "false") return;
  if (typeof setInterval === "undefined") return;

  // HMR reloads this module — clear any previous interval so ticks always use fresh imports.
  stopBackgroundWorker();

  const intervalMs = pollIntervalMs();

  const safeTick = () => {
    void tickOnce().catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("Missing Supabase environment")) return;
      console.error("[worker] background tick failed:", message);
    });
  };

  safeTick();
  timer = setInterval(safeTick, intervalMs);
  console.info(`[worker] background scheduler started (every ${intervalMs}ms)`);
}

export function stopBackgroundWorker(): void {
  if (timer) clearInterval(timer);
  timer = undefined;
}
