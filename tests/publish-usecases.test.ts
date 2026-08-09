import { describe, expect, it } from "vitest";
import { MAX_PUBLISH_ATTEMPTS } from "@/domain/entities";
import {
  attemptEntry,
  isDue,
  retryCampaign,
  scheduleCampaign,
} from "@/application/publish-usecases";
import { createMockAppContext, seedCampaign, seedEntry } from "./helpers/mock-app-context";

const NOW = new Date("2026-01-15T12:00:00.000Z");

describe("isDue", () => {
  it("returns false for published entries", () => {
    const entry = {
      status: "published" as const,
      attempts: 0,
      nextAttemptAt: "2020-01-01T00:00:00.000Z",
      scheduledFor: null,
      leaseUntil: null,
    };
    expect(isDue(entry as never, NOW)).toBe(false);
  });

  it("returns false when an active lease is held", () => {
    const entry = {
      status: "queued" as const,
      attempts: 0,
      nextAttemptAt: "2020-01-01T00:00:00.000Z",
      scheduledFor: null,
      leaseUntil: "2026-01-15T13:00:00.000Z",
    };
    expect(isDue(entry as never, NOW)).toBe(false);
  });

  it("returns true when nextAttemptAt is in the past", () => {
    const entry = {
      status: "queued" as const,
      attempts: 0,
      nextAttemptAt: "2026-01-15T11:00:00.000Z",
      scheduledFor: null,
      leaseUntil: null,
    };
    expect(isDue(entry as never, NOW)).toBe(true);
  });

  it("returns false for exhausted failed entries", () => {
    const entry = {
      status: "failed" as const,
      attempts: MAX_PUBLISH_ATTEMPTS,
      nextAttemptAt: "2020-01-01T00:00:00.000Z",
      scheduledFor: null,
      leaseUntil: null,
    };
    expect(isDue(entry as never, NOW)).toBe(false);
  });
});

describe("attemptEntry", () => {
  it("marks entry failed when image variant is missing", async () => {
    const { context, state } = createMockAppContext({ clock: { now: () => NOW } });
    const campaign = seedCampaign(state);
    const entry = seedEntry(state, {
      campaignId: campaign.id,
      platform: "x",
      imagePath: null,
    });

    const result = await attemptEntry(context, entry);
    expect(result.status).toBe("failed");
    expect(result.error).toContain("Image variant");
    expect(state.attempts).toHaveLength(1);
    expect(state.attempts[0]?.outcome).toBe("failed");
  });

  it("queues again on rate limit with nextAttemptAt set", async () => {
    const { context, state } = createMockAppContext({
      clock: { now: () => NOW },
      publisher: () => ({
        outcome: "rate_limited",
        httpStatus: 429,
        retryAfterSec: 42,
        error: "rate limited",
      }),
    });
    const campaign = seedCampaign(state);
    const entry = seedEntry(state, { campaignId: campaign.id, platform: "x" });

    const result = await attemptEntry(context, entry);
    expect(result.status).toBe("queued");
    expect(result.nextAttemptAt).toBeTruthy();
    expect(result.error).toContain("42s");
    expect(state.attempts[0]?.outcome).toBe("rate_limited");
  });

  it("stays publishing after acceptance — webhook owns terminal status", async () => {
    const { context, state } = createMockAppContext({
      clock: { now: () => NOW },
      publisher: () => ({
        outcome: "accepted",
        httpStatus: 200,
        remoteId: "remote-abc",
      }),
    });
    const campaign = seedCampaign(state);
    const entry = seedEntry(state, { campaignId: campaign.id, platform: "instagram" });

    const result = await attemptEntry(context, entry);
    expect(result.status).toBe("publishing");
    expect(result.remoteId).toBe("remote-abc");
  });
});

describe("scheduleCampaign", () => {
  it("rejects invalid ISO timestamps", async () => {
    const { context, state } = createMockAppContext();
    const campaign = seedCampaign(state);
    seedEntry(state, { campaignId: campaign.id, platform: "x" });

    await expect(
      scheduleCampaign(context, { campaignId: campaign.id, scheduledFor: "not-a-date" }),
    ).rejects.toThrow(/ISO timestamp/);
  });

  it("skips already-published entries", async () => {
    const { context, state } = createMockAppContext({ clock: { now: () => NOW } });
    const campaign = seedCampaign(state);
    const published = seedEntry(state, {
      campaignId: campaign.id,
      platform: "x",
      status: "published",
    });
    const queued = seedEntry(state, {
      campaignId: campaign.id,
      platform: "instagram",
      status: "queued",
    });

    const results = await scheduleCampaign(context, {
      campaignId: campaign.id,
      scheduledFor: "2026-01-20T09:00:00.000Z",
    });

    const publishedResult = results.find((e) => e.id === published.id)!;
    const queuedResult = results.find((e) => e.id === queued.id)!;
    expect(publishedResult.status).toBe("published");
    expect(queuedResult.status).toBe("queued");
    expect(queuedResult.scheduledFor).toBe("2026-01-20T09:00:00.000Z");
  });
});

describe("retryCampaign", () => {
  it("resets failed entries but leaves published ones alone", async () => {
    const { context, state } = createMockAppContext({
      clock: { now: () => NOW },
      publisher: () => ({
        outcome: "accepted",
        httpStatus: 200,
        remoteId: "remote-retry",
      }),
    });
    const campaign = seedCampaign(state);
    const failed = seedEntry(state, {
      campaignId: campaign.id,
      platform: "x",
      status: "failed",
      attempts: 3,
      error: "previous failure",
    });
    const published = seedEntry(state, {
      campaignId: campaign.id,
      platform: "instagram",
      status: "published",
      attempts: 1,
    });

    const results = await retryCampaign(context, campaign.id);
    const failedResult = results.find((e) => e.id === failed.id)!;
    const publishedResult = results.find((e) => e.id === published.id)!;
    expect(publishedResult.status).toBe("published");
    expect(failedResult.attempts).toBeGreaterThan(0);
    expect(failedResult.status).not.toBe("failed");
  });
});
