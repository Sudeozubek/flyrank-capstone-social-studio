/**
 * Token encryption helper (mirrors the `lib/serverUtils.ts` pattern).
 * AES-256-GCM, random 12-byte IV per call, auth tag appended.
 * Format: base64(iv).base64(tag).base64(ciphertext)
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function key(): Buffer {
  const secret = process.env['TOKEN_ENCRYPTION_KEY'];
  if (!secret) {
    // Dev fallback so the sandbox boots without secrets; see .env.example.
    return createHash("sha256").update("flyrank-dev-insecure-token-key").digest();
  }
  return createHash("sha256").update(secret).digest();
}

export function encryptToken(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return [iv.toString("base64"), cipher.getAuthTag().toString("base64"), ct.toString("base64")].join(".");
}

export function decryptToken(payload: string): string {
  const [ivB64, tagB64, ctB64] = payload.split(".");
  if (!ivB64 || !tagB64 || !ctB64) throw new Error("Malformed encrypted token");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(ctB64, "base64")), decipher.final()]).toString("utf8");
}
