import { afterEach, describe, expect, it } from "vitest";
import { formatAiFeatureLabel, formatAiUsd } from "@/domain/ai-spend";
import {
  createInMemoryAiCostMeter,
  resetAiCostMeterForTests,
} from "@/infrastructure/ai/ai-cost-meter.server";

describe("ai spend snapshot", () => {
  afterEach(() => {
    resetAiCostMeterForTests();
    delete process.env["AI_BUDGET_USD"];
    delete process.env["OPENAI_API_KEY"];
  });

  it("formats feature labels for the dashboard", () => {
    expect(formatAiFeatureLabel("caption:instagram")).toBe("Caption · Instagram");
    expect(formatAiFeatureLabel("image:x")).toBe("Image · X");
    expect(formatAiFeatureLabel("caption:linkedin")).toBe("Caption · LinkedIn");
  });

  it("returns recent calls newest-first for the UI", async () => {
    process.env["OPENAI_API_KEY"] = "sk-test";
    const meter = createInMemoryAiCostMeter();
    await meter.record({
      feature: "caption:x",
      model: "gpt-4o-mini",
      inputTokens: 100,
      outputTokens: 40,
      estimatedUsd: 0.0001,
      at: "2026-01-01T10:00:00.000Z",
    });
    await meter.record({
      feature: "image:instagram",
      model: "gpt-image-1.5",
      inputTokens: 0,
      outputTokens: 0,
      estimatedUsd: 0.04,
      at: "2026-01-01T10:01:00.000Z",
    });

    const snapshot = await meter.getSnapshot();
    expect(snapshot.callCount).toBe(2);
    expect(snapshot.recent[0]?.feature).toBe("image:instagram");
    expect(snapshot.recent[1]?.feature).toBe("caption:x");
    expect(formatAiUsd(snapshot.spendUsd)).toMatch(/^\$/);
  });

  it("marks the session exhausted when budget is zero", async () => {
    process.env["OPENAI_API_KEY"] = "sk-test";
    process.env["AI_BUDGET_USD"] = "0";
    const snapshot = await createInMemoryAiCostMeter().getSnapshot();
    expect(snapshot.status).toBe("exhausted");
    expect(snapshot.canSpendMore).toBe(false);
  });
});
