import { describe, expect, it, vi } from "vitest";
import {
  createPublisher,
  InstagramFakeAdapter,
  LinkedInFakeAdapter,
  XFakeAdapter,
} from "@/infrastructure/publishing/adapters.server";
import type { FakePlatformTransport } from "@/infrastructure/publishing/fake-platform-transport.server";
import type { PublishInput, TokenCipher } from "@/domain/ports";

const cipher: TokenCipher = {
  encrypt: (s) => `enc:${s}`,
  decrypt: (s) => s.replace(/^enc:/, ""),
};

const baseInput: PublishInput = {
  campaignId: "c1",
  entryId: "e1",
  userId: "u1",
  platform: "x",
  caption: "Hello world",
  imageRef: "u1/c1/x.png",
};

function makeTransport(response: Awaited<ReturnType<FakePlatformTransport["post"]>>) {
  return { post: vi.fn().mockResolvedValue(response) };
}

describe("fake platform adapters", () => {
  it("maps 200 + id to accepted", async () => {
    const transport = makeTransport({ status: 200, body: { id: "remote-1" } });
    const adapter = new XFakeAdapter({
      transport,
      cipher,
      accessTokenCiphertext: cipher.encrypt("token-abc"),
    });
    const result = await adapter.publish(baseInput, "flyrank:c1:x");
    expect(result.outcome).toBe("accepted");
    expect(result.remoteId).toBe("remote-1");
    expect(transport.post).toHaveBeenCalledWith(
      "x",
      expect.objectContaining({ text: "Hello world" }),
      expect.objectContaining({
        authorization: "Bearer token-abc",
        "idempotency-key": "flyrank:c1:x",
      }),
    );
  });

  it("maps duplicate flag to duplicate outcome", async () => {
    const transport = makeTransport({ status: 200, body: { id: "remote-1", duplicate: true } });
    const adapter = new InstagramFakeAdapter({
      transport,
      cipher,
      accessTokenCiphertext: cipher.encrypt("tok"),
    });
    const result = await adapter.publish(
      { ...baseInput, platform: "instagram" },
      "flyrank:c1:instagram",
    );
    expect(result.outcome).toBe("duplicate");
  });

  it("maps 429 to rate_limited with retryAfterSec", async () => {
    const transport = makeTransport({ status: 429, retryAfterSec: 60, body: {} });
    const adapter = createPublisher("x", {
      transport,
      cipher,
      accessTokenCiphertext: cipher.encrypt("tok"),
    });
    const result = await adapter.publish(baseInput, "key");
    expect(result.outcome).toBe("rate_limited");
    expect(result.retryAfterSec).toBe(60);
  });

  it("maps 4xx to failed", async () => {
    const transport = makeTransport({ status: 400, body: { error: "bad request" } });
    const adapter = createPublisher("x", {
      transport,
      cipher,
      accessTokenCiphertext: cipher.encrypt("tok"),
    });
    const result = await adapter.publish(baseInput, "key");
    expect(result.outcome).toBe("failed");
    expect(result.error).toContain("bad request");
  });

  it("shapes LinkedIn payloads with commentary + media ref", async () => {
    const transport = makeTransport({ status: 201, body: { id: "li-remote-1" } });
    const adapter = new LinkedInFakeAdapter({
      transport,
      cipher,
      accessTokenCiphertext: cipher.encrypt("token-li"),
    });
    const result = await adapter.publish(
      { ...baseInput, platform: "linkedin", caption: "Insight for leaders" },
      "flyrank:c1:linkedin",
    );
    expect(result.outcome).toBe("accepted");
    expect(transport.post).toHaveBeenCalledWith(
      "linkedin",
      expect.objectContaining({
        commentary: "Insight for leaders",
        content: { media: { ref: baseInput.imageRef } },
      }),
      expect.objectContaining({ "idempotency-key": "flyrank:c1:linkedin" }),
    );
  });
});
