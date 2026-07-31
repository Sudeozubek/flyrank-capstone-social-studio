import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { redact, tokenCipher } from "@/infrastructure/crypto/token-cipher.server";
import { signPayload, verifySignature } from "@/infrastructure/crypto/webhook-signature.server";

describe("token encryption at rest", () => {
  it("round-trips AES-256-GCM ciphertext", () => {
    const secret = "fake-platform-access-token-123";
    const enc = tokenCipher.encrypt(secret);
    expect(enc).not.toContain(secret);
    expect(tokenCipher.decrypt(enc)).toBe(secret);
  });

  it("uses a fresh IV per write", () => {
    const a = tokenCipher.encrypt("same-token");
    const b = tokenCipher.encrypt("same-token");
    expect(a).not.toBe(b);
    expect(a.split(".")[0]).not.toBe(b.split(".")[0]);
  });

  it("rejects tampered ciphertext via the auth tag", () => {
    const enc = tokenCipher.encrypt("tampered");
    const [iv, tag, ct] = enc.split(".");
    const flipped = `${iv}.${tag}.${Buffer.from("not-the-same").toString("base64")}`;
    expect(() => tokenCipher.decrypt(flipped)).toThrow();
    expect(ct).toBeTruthy();
  });

  it("redacts token-shaped values for logging", () => {
    expect(redact("super-secret-token")).not.toContain("secret");
  });
});

describe("delivery webhook signatures", () => {
  const body = JSON.stringify({ entryId: "e1", status: "published", remoteId: "r1" });

  it("accepts a correctly signed payload", () => {
    expect(verifySignature(body, signPayload(body))).toBe(true);
  });

  it("rejects a forged signature", () => {
    expect(verifySignature(body, "t=1,v1=deadbeef")).toBe(false);
    expect(verifySignature(body, null)).toBe(false);
  });

  it("rejects a valid signature over a different body (tampering)", () => {
    const header = signPayload(body);
    expect(verifySignature(JSON.stringify({ entryId: "e1", status: "failed" }), header)).toBe(false);
  });

  it("rejects replays outside the timestamp tolerance", () => {
    const old = Math.floor(Date.now() / 1000) - 4000;
    expect(verifySignature(body, signPayload(body, old))).toBe(false);
  });
});

describe("no real social platform is ever called", () => {
  const banned = /graph\.facebook|api\.twitter|api\.x\.com|upload\.twitter|instagram\.com\/api/i;

  function walk(dir: string, out: string[] = []): string[] {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p, out);
      else if (/\.(ts|tsx)$/.test(name)) out.push(p);
    }
    return out;
  }

  it("contains no real platform endpoints in src/", () => {
    const offenders = walk("src").filter((f) => banned.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });
});
