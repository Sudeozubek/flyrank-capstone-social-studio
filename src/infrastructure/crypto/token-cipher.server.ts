/**
 * AES-256-GCM token cipher. Random 12-byte IV per call, auth tag appended.
 * Format: base64(iv).base64(tag).base64(ciphertext)
 * Plaintext OAuth tokens are never persisted or logged.
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type { TokenCipher } from "@/domain/ports";

function key(): Buffer {
  const secret = process.env["TOKEN_ENCRYPTION_KEY"] ?? "flyrank-dev-insecure-token-key";
  return createHash("sha256").update(secret).digest();
}

export const tokenCipher: TokenCipher = {
  encrypt(plaintext: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key(), iv);
    const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    return [
      iv.toString("base64"),
      cipher.getAuthTag().toString("base64"),
      ct.toString("base64"),
    ].join(".");
  },
  decrypt(payload: string): string {
    const [ivB64, tagB64, ctB64] = payload.split(".");
    if (!ivB64 || !tagB64 || !ctB64) throw new Error("Malformed encrypted token");
    const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(ivB64, "base64"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(ctB64, "base64")),
      decipher.final(),
    ]).toString("utf8");
  },
};

/** Redaction helper — wraps anything that might carry a token before logging. */
export function redact(value: string): string {
  return value.length <= 8 ? "***" : `${value.slice(0, 4)}…${"*".repeat(6)}`;
}
