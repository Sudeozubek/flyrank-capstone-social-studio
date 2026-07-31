/**
 * Wk8 — durable scheduling worker.
 *
 * Runs in-process on an interval. Every tick: find due rows, claim each with a
 * lease, publish, release. Because claims live in the durable store and every
 * publish carries a deterministic idempotency key, killing the process mid-batch
 * loses nothing and duplicates nothing — on restart the expired leases are
 * reclaimed and replayed, and the fake platform returns the original post id.
 */

import { claim, dueEntries, publishEntry } from "./campaign.server";
import { logWorker, now } from "./store.server";

export const TICK_MS = 2_000;

let running = false;
let timer: ReturnType<typeof setInterval> | null = null;

export async function runWorkerTick(options: { sleep?: (ms: number) => Promise<void> } = {}) {
  if (running) return { claimed: 0, published: 0 };
  running = true;
  let claimed = 0;
  let published = 0;
  try {
    for (const candidate of dueEntries()) {
      const entry = claim(candidate.id, now());
      if (!entry) continue;
      claimed++;
      const result = await publishEntry(entry, options);
      if (result.outcome === "accepted" || result.outcome === "duplicate") published++;
    }
  } finally {
    running = false;
  }
  return { claimed, published };
}

export function ensureWorker() {
  if (timer) return;
  timer = setInterval(() => {
    void runWorkerTick().catch((err) => logWorker("error", `tick failed: ${String(err)}`));
  }, TICK_MS);
  // Do not hold the process open in tests / short-lived runtimes.
  (timer as unknown as { unref?: () => void }).unref?.();
  logWorker("info", "scheduler worker started");
}

export function stopWorker() {
  if (timer) clearInterval(timer);
  timer = null;
}
