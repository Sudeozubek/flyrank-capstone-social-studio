import { afterEach, describe, expect, it, vi } from "vitest";
import {
  aiBudgetUsd,
  CHAT_PREFLIGHT_USD,
  createInMemoryAiCostMeter,
  estimateChatCost,
  imageGenerationEstimateUsd,
  resetAiCostMeterForTests,
} from "@/infrastructure/ai/ai-cost-meter.server";

describe("ai cost meter", () => {
  afterEach(() => {
    resetAiCostMeterForTests();
    delete process.env["AI_BUDGET_USD"];
  });

  it("defaults to a $1 session budget", () => {
    expect(aiBudgetUsd()).toBe(1);
  });

  it("reads AI_BUDGET_USD from the environment", () => {
    process.env["AI_BUDGET_USD"] = "0.5";
    expect(aiBudgetUsd()).toBe(0.5);
  });

  it("estimates chat cost from token usage", () => {
    const cost = estimateChatCost("gpt-4o-mini", 1_000, 500);
    expect(cost).toBeGreaterThan(0);
    expect(cost).toBeLessThan(0.001);
  });

  it("blocks further spend once the budget is exhausted", async () => {
    process.env["AI_BUDGET_USD"] = "0.0001";
    const meter = createInMemoryAiCostMeter();
    await meter.record({
      feature: "test",
      model: "gpt-4o-mini",
      inputTokens: 100,
      outputTokens: 50,
      estimatedUsd: 0.0001,
    });
    const snapshot = await meter.getSnapshot();
    expect(snapshot.spendUsd).toBeCloseTo(0.0001, 6);
    expect(await meter.canSpend(CHAT_PREFLIGHT_USD)).toBe(false);
  });

  it("attributes image generation with a flat per-image estimate", async () => {
    process.env["AI_BUDGET_USD"] = "1";
    const meter = createInMemoryAiCostMeter();
    const estimate = imageGenerationEstimateUsd();
    expect(estimate).toBeGreaterThan(0);
    expect(await meter.canSpend(estimate)).toBe(true);
  });
});

describe("caption writer budget guard", () => {
  afterEach(() => {
    resetAiCostMeterForTests();
    delete process.env["AI_BUDGET_USD"];
    delete process.env["OPENAI_API_KEY"];
    vi.restoreAllMocks();
  });

  it("falls back to the deterministic composer when budget is exhausted", async () => {
    process.env["AI_BUDGET_USD"] = "0";
    process.env["OPENAI_API_KEY"] = "sk-test";
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const { openAiCaptionWriter } = await import(
      "@/infrastructure/ai/openai-caption-writer.server"
    );
    const caption = await openAiCaptionWriter.write(
      {
        id: "p1",
        title: "Reliability engineering for social publishing",
        body: "Retries must not duplicate posts. Leases make a crashed worker safe.",
        url: "https://example.com/post",
      },
      "x",
    );

    expect(caption.length).toBeGreaterThan(0);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
