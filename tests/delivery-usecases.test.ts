import { describe, expect, it } from "vitest";
import { applyDelivery } from "@/application/delivery-usecases";
import { createMockAppContext, seedCampaign, seedEntry } from "./helpers/mock-app-context";

const NOW = new Date("2026-01-15T12:00:00.000Z");

describe("applyDelivery", () => {
  it("returns null for unknown entry ids", async () => {
    const { context } = createMockAppContext({ clock: { now: () => NOW } });
    const result = await applyDelivery(context, {
      entryId: "missing",
      platform: "x",
      remoteId: "r1",
      status: "delivered",
    });
    expect(result).toBeNull();
  });

  it("marks entry published on delivered webhook", async () => {
    const { context, state } = createMockAppContext({ clock: { now: () => NOW } });
    const campaign = seedCampaign(state, { status: "publishing" });
    const entry = seedEntry(state, {
      campaignId: campaign.id,
      platform: "x",
      status: "publishing",
    });

    const result = await applyDelivery(context, {
      entryId: entry.id,
      platform: "x",
      remoteId: "remote-99",
      status: "delivered",
    });

    expect(result?.status).toBe("published");
    expect(result?.remoteId).toBe("remote-99");
    expect(state.campaigns[0]?.status).toBe("completed");
  });

  it("marks entry failed on rejected webhook", async () => {
    const { context, state } = createMockAppContext({ clock: { now: () => NOW } });
    const campaign = seedCampaign(state);
    const entry = seedEntry(state, {
      campaignId: campaign.id,
      platform: "instagram",
      status: "publishing",
    });

    const result = await applyDelivery(context, {
      entryId: entry.id,
      platform: "instagram",
      remoteId: "remote-fail",
      status: "rejected",
      reason: "Policy violation",
    });

    expect(result?.status).toBe("failed");
    expect(result?.error).toBe("Policy violation");
  });

  it("syncs campaign status to completed when all siblings are published", async () => {
    const { context, state } = createMockAppContext({ clock: { now: () => NOW } });
    const campaign = seedCampaign(state, { status: "publishing" });
    const xEntry = seedEntry(state, {
      campaignId: campaign.id,
      platform: "x",
      status: "published",
    });
    const igEntry = seedEntry(state, {
      campaignId: campaign.id,
      platform: "instagram",
      status: "publishing",
    });

    await applyDelivery(context, {
      entryId: igEntry.id,
      platform: "instagram",
      remoteId: "remote-ig",
      status: "delivered",
    });

    expect(state.campaigns[0]?.status).toBe("completed");
    expect(xEntry.status).toBe("published");
  });
});
