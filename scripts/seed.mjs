#!/usr/bin/env node
/**
 * Automated demo seed — creates a demo user, blog post, campaign and per-platform entries.
 * Requires SUPABASE_URL + service-role key in `.env` (or environment).
 */

import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DEMO_EMAIL = process.env["SEED_DEMO_EMAIL"]?.trim() || "demo@campaignhub.local";
const DEMO_PASSWORD = process.env["SEED_DEMO_PASSWORD"]?.trim() || "demo-demo-demo";

const PLATFORMS = ["instagram", "x", "linkedin"];

const POST = {
  title: "Durable scheduling for social publishing",
  body:
    "Publishing at scale is a reliability problem. Retries must not duplicate posts. " +
    "Leases make a crashed worker safe. Idempotency keys collapse replays into one remote post. " +
    "Every attempt is recorded for audit.",
  url: "https://example.com/durable-scheduling",
};

function loadEnvFile() {
  const path = join(process.cwd(), ".env");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function captionFor(platform) {
  const base = POST.body;
  if (platform === "instagram") {
    return (
      `📣 ${POST.title}\n\n` +
      `${base}\n\n` +
      `Read the full article → ${POST.url}\n\n` +
      `#socialmedia #publishing #reliability #campaignhub #contentstrategy #growth #community #brand`
    );
  }
  if (platform === "x") {
    return (
      `${POST.title}\n\n` +
      `Retries must not duplicate posts.\n\n` +
      `Leases make a crashed worker safe.\n\n` +
      `${POST.url}\n\n` +
      `#publishing #reliability`
    );
  }
  return (
    `${POST.title}\n\n` +
    `${base}\n\n` +
    `We wrote this for operators who care about lease-based scheduling and audit trails.\n\n` +
    `→ ${POST.url}\n\n` +
    `#B2B #marketing #socialmedia #leadership #content`
  );
}

function resolveServiceKey() {
  const candidates = [process.env["SUPABASE_SERVICE_ROLE_KEY"], process.env["SUPABASE_SECRET_KEY"]];
  for (const value of candidates) {
    const key = value?.trim();
    if (!key || key.startsWith("sb_publishable_")) continue;
    return key;
  }
  return undefined;
}

async function ensureDemoUser(admin) {
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
  });

  if (!createError && created.user) {
    return created.user.id;
  }

  const message = createError?.message?.toLowerCase() ?? "";
  if (!message.includes("already") && !message.includes("registered")) {
    throw new Error(createError?.message ?? "Could not create demo user");
  }

  const { data: listed, error: listError } = await admin.auth.admin.listUsers({ perPage: 200 });
  if (listError) throw new Error(listError.message);
  const existing = listed.users.find((u) => u.email === DEMO_EMAIL);
  if (!existing) throw new Error("Demo user exists but could not be resolved");
  return existing.id;
}

async function main() {
  loadEnvFile();

  const url = process.env["SUPABASE_URL"]?.trim();
  const serviceKey = resolveServiceKey();
  if (!url || !serviceKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env — see .env.example");
    process.exit(1);
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: WebSocket },
  });

  const userId = await ensureDemoUser(admin);
  console.log(`Demo user: ${DEMO_EMAIL}`);

  const { data: existingPosts, error: existingError } = await admin
    .from("blog_posts")
    .select("id")
    .eq("user_id", userId)
    .eq("source", "seed")
    .limit(1);
  if (existingError) throw new Error(existingError.message);

  if (existingPosts?.length) {
    console.log("Seed data already present — skipping inserts.");
    console.log(`Sign in at /auth with ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
    return;
  }

  const { data: post, error: postError } = await admin
    .from("blog_posts")
    .insert({
      user_id: userId,
      title: POST.title,
      body: POST.body,
      url: POST.url,
      source: "seed",
    })
    .select()
    .single();
  if (postError || !post) throw new Error(postError?.message ?? "blog_posts insert failed");

  const { data: campaign, error: campaignError } = await admin
    .from("campaigns")
    .insert({
      user_id: userId,
      post_id: post.id,
      name: "Seed Campaign — Multi-Platform Demo",
      status: "draft",
    })
    .select()
    .single();
  if (campaignError || !campaign) {
    throw new Error(campaignError?.message ?? "campaigns insert failed");
  }

  for (const platform of PLATFORMS) {
    const { error: entryError } = await admin.from("social_post_entries").upsert(
      {
        user_id: userId,
        campaign_id: campaign.id,
        platform,
        caption: captionFor(platform),
        idempotency_key: `flyrank:${campaign.id}:${platform}`,
      },
      { onConflict: "campaign_id,platform" },
    );
    if (entryError) throw new Error(entryError.message);
  }

  const base = process.env["PUBLIC_BASE_URL"]?.trim() || "http://localhost:8080";
  console.log("Seed complete.");
  console.log(`  Post:      ${post.title}`);
  console.log(`  Campaign:  ${campaign.name} (${campaign.id})`);
  console.log(`  Platforms: ${PLATFORMS.join(", ")}`);
  console.log(`  Sign in:   ${base}/auth`);
  console.log(`  Email:     ${DEMO_EMAIL}`);
  console.log(`  Password:  ${DEMO_PASSWORD}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
