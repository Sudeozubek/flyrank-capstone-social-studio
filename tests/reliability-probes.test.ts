/**
 * Capstone acceptance probes (§12) — deterministic, no live DB/network.
 */

import { describe, expect, it } from "vitest";
import { buildIdempotencyKey, backoffSeconds } from "@/domain/entities";
import { attemptEntry, isDue } from "@/application/publish-usecases";
import { applyDelivery } from "@/application/delivery-usecases";
import { verifySignature, signPayload } from "@/infrastructure/crypto/webhook-signature.server";
import {
  createMockAppContext,
  seedCampaign,
  seedEntry,
} from "./helpers/mock-app-context";

const NOW = new Date("2026-01-15T12:00:00.000Z");

describe("probe 1 — idempotent publishing", () => {
  it("uses a deterministic key per (campaign, platform)", () => {
    expect(buildIdempotencyKey("camp-1", "instagram")).toBe("flyrank:camp-1:instagram");
    expect(buildIdempotencyKey("camp-1", "x")).toBe("flyrank:camp-1:x");
    expect(buildIdempotencyKey("camp-1", "instagram")).toBe(
      buildIdempotencyKey("camp-1", "instagram"),
    );
  });

  it("maps a duplicate platform response without creating a second remote post", async () => {
    let publishCalls = 0;
    const { context, state } = createMockAppContext({
      clock: { now: () => NOW },
      publisher: () => {
        publishCalls += 1;
        return publishCalls === 1
          ? { outcome: "accepted", httpStatus: 201, remoteId: "remote-1" }
          : { outcome: "duplicate", httpStatus: 200, remoteId: "remote-1" };
      },
    });
    const campaign = seedCampaign(state);
    const entry = seedEntry(state, { campaignId: campaign.id, platform: "x" });

    await attemptEntry(context, entry);
    const replay = await attemptEntry(context, {
      ...entry,
      status: "queued",
      attempts: 1,
      leaseUntil: null,
    });

    expect(publishCalls).toBe(2);
    expect(replay.status).toBe("publishing");
    expect(replay.remoteId).toBe("remote-1");
  });
});

describe("probe 2 — rate limit honouring", () => {
  it("prefers Retry-After over the exponential floor", () => {
    expect(backoffSeconds(1, 30)).toBe(30);
    expect(backoffSeconds(1, 42)).toBe(42);
  });

  it("re-queues with the honoured delay after a 429", async () => {
    const { context, state } = createMockAppContext({
      clock: { now: () => NOW },
      publisher: () => ({
        outcome: "rate_limited",
        httpStatus: 429,
        retryAfterSec: 30,
      }),
    });
    const campaign = seedCampaign(state);
    const entry = seedEntry(state, { campaignId: campaign.id, platform: "instagram" });

    const result = await attemptEntry(context, entry);
    expect(result.status).toBe("queued");
    expect(result.error).toContain("30s");
    expect(state.attempts[0]?.retryAfterSec).toBe(30);
  });
});

describe("probe 3 — crash-resume without duplicates", () => {
  it("reclaims an entry whose lease has expired", () => {
    const entry = {
      status: "publishing" as const,
      attempts: 1,
      scheduledFor: "2026-01-15T11:00:00.000Z",
      nextAttemptAt: "2026-01-15T11:00:00.000Z",
      leaseUntil: "2026-01-15T11:30:00.000Z",
    };
    expect(isDue(entry as never, NOW)).toBe(true);
  });

  it("replays under the same idempotency key after a simulated crash", async () => {
    let publishCalls = 0;
    const { context, state } = createMockAppContext({
      clock: { now: () => NOW },
      publisher: () => {
        publishCalls += 1;
        return { outcome: "duplicate", httpStatus: 200, remoteId: "remote-crash" };
      },
    });
    const campaign = seedCampaign(state);
    const entry = seedEntry(state, {
      campaignId: campaign.id,
      platform: "x",
      status: "publishing",
      attempts: 1,
      leaseUntil: "2026-01-15T11:30:00.000Z",
    });

    const replay = await attemptEntry(context, { ...entry, leaseUntil: null });
    expect(publishCalls).toBe(1);
    expect(replay.remoteId).toBe("remote-crash");
    expect(replay.status).toBe("publishing");
  });
});

describe("probe 4 — webhook trust boundary", () => {
  const body = JSON.stringify({
    entryId: "00000000-0000-4000-8000-000000000001",
    platform: "x",
    remoteId: "remote-1",
    status: "delivered",
  });

  it("rejects a forged signature", () => {
    expect(verifySignature(body, "t=1,v1=deadbeef")).toBe(false);
  });

  it("accepts a valid signature for the same body", () => {
    expect(verifySignature(body, signPayload(body))).toBe(true);
  });

  it("only flips to published after a verified delivered event", async () => {
    const { context, state } = createMockAppContext({ clock: { now: () => NOW } });
    const campaign = seedCampaign(state, { status: "publishing" });
    const entry = seedEntry(state, {
      campaignId: campaign.id,
      platform: "x",
      status: "publishing",
      remoteId: "remote-1",
    });

    const updated = await applyDelivery(context, {
      entryId: entry.id,
      platform: "x",
      remoteId: "remote-1",
      status: "delivered",
    });

    expect(updated?.status).toBe("published");
    expect(state.campaigns.find((c) => c.id === campaign.id)?.status).toBe("completed");
  });
});
