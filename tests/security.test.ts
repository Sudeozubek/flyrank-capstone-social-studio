import { describe, expect, it } from "vitest";
import { signPayload, verifySignature } from "@/lib/webhook-signature.server";
import { decryptToken, encryptToken } from "@/lib/crypto.server";

describe("webhook signature", () => {
  const body = JSON.stringify({ event: "post.delivered", status: "published" });

  it("accepts a correctly signed payload", () => {
    expect(verifySignature(body, signPayload(body))).toBe(true);
  });

  it("rejects a forged signature", () => {
    expect(verifySignature(body, "t=1,v1=deadbeef")).toBe(false);
    expect(verifySignature(body, null)).toBe(false);
    expect(verifySignature(body, "garbage")).toBe(false);
  });

  it("rejects a tampered body", () => {
    const sig = signPayload(body);
    expect(verifySignature(body.replace("published", "failed"), sig)).toBe(false);
  });

  it("rejects a stale timestamp (replay)", () => {
    const old = Math.floor(Date.now() / 1000) - 4000;
    expect(verifySignature(body, signPayload(body, old))).toBe(false);
  });
});

describe("token encryption at rest", () => {
  it("round-trips and uses a fresh IV each time", () => {
    const token = "fpt_instagram_abc123";
    const a = encryptToken(token);
    const b = encryptToken(token);
    expect(a).not.toEqual(b); // random IV per write
    expect(decryptToken(a)).toEqual(token);
    expect(decryptToken(b)).toEqual(token);
  });

  it("fails closed on tampered ciphertext", () => {
    const enc = encryptToken("secret");
    const [iv, tag, ct] = enc.split(".");
    expect(() => decryptToken(`${iv}.${tag}.${Buffer.from("nope").toString("base64")}`)).toThrow();
    expect(ct).toBeTruthy();
  });
});
