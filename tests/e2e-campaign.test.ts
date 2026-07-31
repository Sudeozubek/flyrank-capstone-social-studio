/**
 * End-to-end against the running dev server (fake platform only).
 * Skipped automatically when the server is not reachable.
 */
import { beforeAll, describe, expect, it } from "vitest";

const BASE = process.env["PUBLIC_BASE_URL"] ?? "http://localhost:8080";
const POST_ID = "post_pipeline";

const post = async (path: string, body?: unknown) =>
  fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

const get = async <T>(path: string): Promise<T> => (await fetch(`${BASE}${path}`)).json() as Promise<T>;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let reachable = false;

async function waitForStatus(status: string, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const { campaign } = await get<{ campaign: { entries: { status: string }[] } }>(
      `/api/campaigns/${POST_ID}`,
    );
    if (campaign.entries.every((e) => e.status === status)) return campaign;
    await sleep(500);
  }
  throw new Error(`timed out waiting for all entries to be ${status}`);
}

beforeAll(async () => {
  reachable = await fetch(`${BASE}/api/posts`)
    .then((r) => r.ok)
    .catch(() => false);
});

describe.sequential("campaign engine end to end", () => {
  it("publishes idempotently even when spammed", async () => {
    if (!reachable) return;
    await post("/api/dev", { action: "reset" });
    expect((await post("/api/campaigns", { postId: POST_ID })).status).toBe(201);

    await Promise.all([1, 2, 3, 4, 5].map(() => post(`/api/campaigns/${POST_ID}/publish`)));
    await waitForStatus("published");

    const { posts } = await get<{ posts: { idempotencyKey: string }[] }>(
      "/api/public/fake-platform/publish",
    );
    const keys = posts.map((p) => p.idempotencyKey);
    expect(keys).toHaveLength(new Set(keys).size); // no duplicates on the platform
    expect(keys).toHaveLength(2); // exactly one post per platform
  }, 40000);

  it("honours 429 + Retry-After and eventually succeeds", async () => {
    if (!reachable) return;
    await post("/api/dev", { action: "reset" });
    await post("/api/campaigns", { postId: POST_ID });
    await post("/api/dev", { action: "force429", count: 2 });
    await post(`/api/campaigns/${POST_ID}/publish`);

    const logs = await get<{ worker: { message: string }[] }>("/api/logs");
    expect(logs.worker.some((l) => /rate|429|retry/i.test(l.message))).toBe(true);
    await waitForStatus("published", 25000);
  }, 40000);

  it("rejects a forged webhook with 400 and leaves state untouched", async () => {
    if (!reachable) return;
    await post("/api/dev", { action: "reset" });
    await post("/api/campaigns", { postId: POST_ID });

    const before = await get<{ campaign: { entries: { status: string }[] } }>(`/api/campaigns/${POST_ID}`);
    const forged = await post("/api/dev", { action: "sendWebhook", postId: POST_ID, forged: true });
    expect(((await forged.json()) as { status: number }).status).toBe(400);

    const after = await get<{ campaign: { entries: { status: string }[] } }>(`/api/campaigns/${POST_ID}`);
    expect(after.campaign.entries.map((e) => e.status)).toEqual(
      before.campaign.entries.map((e) => e.status),
    );
  }, 20000);

  it("publishes a scheduled campaign only after the clock advances", async () => {
    if (!reachable) return;
    await post("/api/dev", { action: "reset" });
    await post("/api/campaigns", { postId: POST_ID });
    await post(`/api/campaigns/${POST_ID}/schedule`, {
      scheduledFor: new Date(Date.now() + 20 * 60_000).toISOString(),
    });

    const pending = await get<{ campaign: { entries: { status: string }[] } }>(`/api/campaigns/${POST_ID}`);
    expect(pending.campaign.entries.every((e) => e.status === "queued")).toBe(true);

    await post("/api/dev", { action: "advanceClock", minutes: 25 });
    await waitForStatus("published", 25000);
  }, 40000);
});
