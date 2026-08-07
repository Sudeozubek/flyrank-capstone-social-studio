#!/usr/bin/env node
/**
 * Demo seed instructions — run after `npm run dev`.
 * Full automation would require live Supabase credentials; the dashboard
 * flow is the supported seed path for reviewers.
 */

const base = process.env["PUBLIC_BASE_URL"]?.trim() || "http://localhost:8080";

console.log(`
CampaignHub Studio — demo seed

Prerequisites:
  1. cp .env.example .env  (Supabase URL + keys; optional OPENAI_API_KEY)
  2. Apply supabase/flyrank-full-schema.sql in the Supabase SQL editor
  3. npm run dev

Seed a campaign (interactive):
  1. Open ${base}/auth and sign up (email or Google)
  2. Dashboard → Blog library → pick a published article
  3. Generate campaign → schedule or publish now

The background worker polls every WORKER_POLL_INTERVAL_MS (default 10s) and
publishes due rows automatically — no manual tick required.

Probes:
  npm run test   # unit + reliability probe suites (no network/DB)
`);
