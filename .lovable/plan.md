## Goal

Rebuild the current prototype into the capstone exactly as the PDF specifies: every §6 Definition-of-Done box, all 6 acceptance probes, the 8 shared requirements, the §11 submission pack — plus official MCP orchestration and user-authored content input.

Current gaps vs. the PDF: storage is a JSON file (no migrations/indexes/tenants), there is no auth, no submission-pack files (`capstone.yaml`, `EVIDENCE.md`, `BUILDLOG.md`, LICENSE), image variants are SVG rather than real raster artifacts, MCP is a hand-rolled JSON-RPC route, and business logic sits in route files rather than in layered services behind repository interfaces.

---

## 1. Architecture (Clean Architecture + SOLID)

```text
domain/        entities, value objects, ports (interfaces) — zero I/O
  entities: BlogPost, Campaign, SocialPostEntry, PlatformCredential
  ports:    CampaignRepository, PostRepository, CredentialRepository,
            WebhookLogRepository, SocialPublisher, ImageRenderer,
            DocumentParser, Clock, IdGenerator
application/   use cases — depend on ports only
  CreateCampaign, GenerateCaptions, GenerateImages, ScheduleCampaign,
  PublishCampaign, RetryCampaign, GetCampaignStatus, IngestDeliveryWebhook,
  ImportDocument
infrastructure/
  persistence/supabase/*  repository implementations (Postgres)
  publisher/adapters/*    InstagramFakeAdapter, XFakeAdapter (only network layer)
  crypto/                 AES-256-GCM token encryption (random IV)
  imaging/                crop geometry + sharp/Jimp renderers
  parsing/                markdown / pdf / docx extractors
interfaces/
  http/    TanStack server routes (REST) + fake-platform + webhook
  mcp/     @lovable.dev/mcp-js tools — thin delegates to use cases
  web/     React SaaS dashboard
```

Dependency rule: `interfaces → application → domain`. Adapters and repositories are injected; no use case imports Supabase, `sharp`, or `fetch`. Swapping Postgres, the image backend, or a platform touches one folder.

## 2. Persistence (Lovable Cloud / Postgres + Auth)

Email+password and Google sign-in; every row scoped by `user_id` with RLS (the rubric's "isolated tenants"). Schema shipped as migrations with explicit indexes and grants:

| Table | Key columns | Indexes |
|---|---|---|
| `profiles` | `id → auth.users`, display_name | pk |
| `blog_posts` | id, user_id, title, body, url, source (`paste`/`md`/`pdf`/`docx`), created_at | (user_id, created_at desc) |
| `campaigns` | id, user_id, post_id, status (`draft`/`scheduled`/`publishing`/`completed`/`failed`), scheduled_for | (user_id), (scheduled_for) |
| `social_post_entries` | id, campaign_id, user_id, platform, caption, image_path, status (`queued`/`publishing`/`published`/`failed`), idempotency_key **UNIQUE(campaign_id, platform)**, attempts, lease_until, remote_id, error, published_at | (status, scheduled_for), unique idempotency_key |
| `platform_credentials` | user_id, platform, `access_token_ciphertext`, expires_at | unique (user_id, platform) |
| `publish_attempts` | entry_id, attempt_no, http_status, retry_after_sec, outcome, at | (entry_id) |
| `webhook_events` | id, entry_id, signature_valid, http_status, payload_digest, received_at | (entry_id, received_at desc) |

No plaintext token column exists anywhere (PROBE 6). Private storage bucket `campaign-images` holds the generated PNGs under per-user paths.

## 3. Content pipeline

- **Input (the one allowed UX extension):** paste a blog post, or upload `.md` / `.pdf` / `.docx`, plus optional URL. Parsing is **server-side** behind a `DocumentParser` port using mature libraries (markdown parser; `mammoth` for DOCX; a Worker-safe pure-JS PDF text extractor). Output normalises to the canonical `{ title, body, url }`. Zod validation at the boundary; bad input → 4xx, never 500.
- **Images — `ImageRenderer` port, two adapters, no custom encoder:**
  - `SharpImageRenderer` — used whenever a native Node runtime is available (local `npm run dev`, Docker, tests).
  - `JimpImageRenderer` — pure-JS fallback for the serverless/Workers runtime, where `sharp`'s native binary cannot load.
  - One selector picks the renderer at startup; crop/safe-zone geometry stays shared and pure, so both paths produce byte-identical dimensions: Instagram **1080×1080**, X **1600×900**. Tests assert real decoded PNG dimensions from both renderers (PROBE 5).
- **Captions:** shared brand-voice fragments + per-platform fragments composed structurally — no duplicated prompt strings.

## 4. Publishing & reliability

- `SocialPublisher` port with two fake adapters; application code never names a platform transport.
- Deterministic idempotency key `flyrank:{campaignId}:{platform}`, enforced by a unique DB constraint *and* by the fake platform — publish twice + retry after timeout = one post (PROBE 1).
- `429 + Retry-After` → adapter honours the header, exponential backoff floor, capped attempts, every attempt recorded in `publish_attempts` (PROBE 2).
- Durable scheduler: due rows claimed with a short `lease_until` via a conditional `UPDATE`, so a crashed worker's claims expire and are replayed under the same idempotency key — restart, zero duplicates (PROBE 3). Worker ticks in-process and is also invocable via an authenticated endpoint so the demo can kill/restart it.
- Terminal status flips **only** on a signature-verified delivery webhook (HMAC-SHA256, timestamp + replay window, timing-safe compare). Forged → `400`, status unchanged (PROBE 4).
- Tokens: AES-256-GCM, fresh random IV per write, key from env, never logged; a redaction helper wraps all logging.

## 5. API surface

`POST /api/posts`, `POST /api/posts/import`, `GET /api/posts`, `POST /api/campaigns`, `GET /api/campaigns`, `GET /api/campaigns/:id`, `POST /api/campaigns/:id/schedule`, `POST /api/campaigns/:id/publish`, `POST /api/campaigns/:id/retry`, `GET /api/campaigns/:id/status`, dev controls (force 429, advance clock, kill/restart worker), plus the sandbox: `/api/public/fake-platform/oauth/token`, `/api/public/fake-platform/publish`, `/api/public/webhooks/delivery`. Authenticated routes act as the signed-in user under RLS; the fake platform and webhook stay public and self-verified.

## 6. MCP (the sanctioned enhancement)

Replace the hand-rolled JSON-RPC route with the official `@lovable.dev/mcp-js` server, OAuth-protected against Cloud Auth so an assistant acts as a real user. Tools — `create_campaign`, `generate_captions`, `generate_images`, `schedule_campaign`, `publish_campaign`, `retry_campaign`, `campaign_status` — are thin wrappers over the same use cases as the HTTP layer. No duplicated business logic.

## 7. UI (Linear / Vercel / Stripe register)

Dark-first, high-contrast neutral surfaces with a single accent, tight typographic scale, keyboard-friendly, all colours as semantic tokens. Screens: auth, campaign list, campaign composer (paste/upload/URL), campaign detail with side-by-side platform variant previews and caption comparison, live status timeline (queued → publishing → published), attempts/webhook audit drawer, and a demo control rail for the six probes.

## 8. Tests & submission pack

Deterministic vitest suites: decoded PNG dimensions per platform per renderer, caption divergence, duplicate-publish → one post, timeout-then-retry → one post, 429/Retry-After backoff, crash-resume without duplicates, forged webhook → 400 + unchanged status, valid webhook → published, no-plaintext-token scan. Plus `README.md` (architecture diagram, run/seed steps, honest limitations incl. the sharp/Jimp runtime note), `capstone.yaml`, `EVIDENCE.md` (pasted output per DoD box), `BUILDLOG.md`, `.env.example`, MIT `LICENSE`.

## Build order

1. Enable Cloud, auth, migrations + RLS, repositories behind ports.
2. Domain + application layer; port the existing caption/geometry logic in.
3. `ImageRenderer` (sharp + Jimp) producing real PNGs; document import.
4. Adapters, idempotency, 429 handling, encrypted credentials.
5. Durable scheduler + signed webhooks + audit trails.
6. REST layer, then MCP server over the same use cases.
7. SaaS UI.
8. Tests, then the submission pack with real pasted evidence.

**Non-goal (explicit):** no real social platform API is ever called; every stretch goal beyond MCP and document import stays out.
