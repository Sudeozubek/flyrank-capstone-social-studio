/**
 * Delivery webhook signatures (Stripe-style: `t=<unix>,v1=<hmac sha256 of "t.body">`).
 * Shared by the fake platform (signing) and the delivery endpoint (verifying).
 */

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const SIGNATURE_HEADER = "x-flyrank-signature";

function webhookSecret(): string {
  return process.env["WEBHOOK_SIGNING_SECRET"] ?? "flyrank-dev-webhook-secret";
}

export function signPayload(body: string, timestamp = Math.floor(Date.now() / 1000)): string {
  const v1 = createHmac("sha256", webhookSecret()).update(`${timestamp}.${body}`).digest("hex");
  return `t=${timestamp},v1=${v1}`;
}

/** Constant-time verification with a replay window. */
export function verifySignature(body: string, header: string | null, toleranceSec = 300): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(
    header.split(",").map((kv) => {
      const [k, ...rest] = kv.trim().split("=");
      return [k ?? "", rest.join("=")];
    }),
  );
  const t = Number(parts["t"]);
  const v1 = parts["v1"];
  if (!Number.isFinite(t) || !v1) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - t) > toleranceSec) return false;

  const expected = createHmac("sha256", webhookSecret()).update(`${t}.${body}`).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(v1, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function digest(body: string): string {
  return createHash("sha256").update(body).digest("hex").slice(0, 32);
}
