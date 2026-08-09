# EVIDENCE.md — FlyRank capstone Definition of Done

Project: **CampaignHub Studio** (FlyRank capstone submission)
Everything below is verifiable from this repository without hunting for context.
Replace `<REPO>` with the repository URL when publishing (e.g.
`https://github.com/<owner>/<repo>/blob/main/`).

Reproduce every automated check with:

```bash
npm install && npm run test
# 24 files, 131 tests, all passing
```

Screenshots are captured and committed under `docs/screenshots/` (20 numbered images,
referenced per requirement below; `10b-rls-policies.png` accompanies `10-auth-and-rls.png` when present).

---

## DoD 1 — One post in, per-platform variants out

**Explanation.** Given a published post (title + body + URL), the engine produces one
`SocialPostEntry` per platform (Instagram, X, LinkedIn), each with its own image variant and
its own caption.

**Evidence.** Creating a campaign fans out to `PLATFORMS` and upserts one entry per platform
with a per-platform idempotency key; the dashboard renders variants in a carousel with
platform tabs.

- Implementation: `<REPO>src/application/campaign-usecases.ts`, `<REPO>src/domain/entities.ts`
- Interface: server function `createCampaignWithAssets` — `<REPO>src/lib/flyrank.functions.ts`
- MCP tool: `create_campaign` — `<REPO>src/mcp/tools/create-campaign.ts`
- Tests: `tests/domain.test.ts › image geometry`, `tests/domain.test.ts › captions`,
  `tests/captions.test.ts`
- Screenshot: `docs/screenshots/01-campaign-variants.png`,
  `docs/screenshots/12-dashboard-blog-library-and-campaign-variants.png`,
  `docs/screenshots/14-variant-gallery-carousel-three-platforms.png`

## DoD 2 — Exact per-platform image dimensions with subject in the safe zone

**Explanation.** Instagram `1080×1080`, X `1600×900`, LinkedIn `1200×627`. Crop is
aspect-preserving and centred on the subject; the subject is then scaled/recentred so it
provably sits inside the safe zone.

**Evidence.** Output PNG width/height are read straight from the PNG IHDR chunk — no library is
trusted — and the geometry assertions check safe-zone containment and aspect ratio.

- Implementation: `<REPO>src/domain/image-composition.ts` (`computeVariantGeometry`,
  `fitSubjectToSafeZone`), `<REPO>src/infrastructure/imaging/renderers.server.ts`
  (`sharpRenderer`, `jimpRenderer`), `<REPO>src/config/platform-specs.ts`
- Interface: `regenerateImages` server function; images stored via
  `<REPO>src/infrastructure/storage/image-store.server.ts`
- Tests: `tests/imaging.test.ts › renders exact platform dimensions`,
  `tests/domain.test.ts › image geometry`
- Screenshot: `docs/screenshots/02-image-variants.png`

```
✓ tests/imaging.test.ts (1 test)
✓ tests/domain.test.ts › image geometry › produces exact per-platform output dimensions
✓ tests/domain.test.ts › image geometry › keeps the subject inside the safe zone after fitting
```

## DoD 3 — Platform-tailored captions (not truncations of each other)

**Explanation.** Captions are composed from shared brand voice + per-platform fragments,
optional brand tone and output language, and article-derived hooks/takeaways — not generic
"we published a post" boilerplate. The LLM path uses the same fragment architecture; the
deterministic composer is the fallback and the tested reference implementation.

**Evidence.** Assertions prove divergence across platforms, per-platform length limits,
hashtag budgets, brand-tone differentiation, multi-language fragments, content anchoring to
the source article, and determinism.

- Implementation: `<REPO>src/domain/captions.ts`,
  `<REPO>src/config/social-prompts.config.ts`,
  `<REPO>src/infrastructure/ai/openai-caption-writer.server.ts`
- Interface: `createCampaignWithAssets`, `regenerateCaptions`
- Tests: `tests/domain.test.ts › captions` (4 tests), `tests/captions.test.ts`,
  `tests/campaign-languages.test.ts`
- Screenshot: `docs/screenshots/03-caption-comparison.png`,
  `docs/screenshots/15-brand-tone-selector.png`,
  `docs/screenshots/16-campaign-language-selector.png`

## DoD 4 — Unified publisher interface, fake platform only

**Explanation.** Application code depends on the `SocialPublisher` port; only
`src/infrastructure/publishing/**` performs platform I/O, and it targets the in-repo fake
platform. No real social endpoint exists anywhere in `src/`.

**Evidence.** A repo-wide scan test fails the build if `graph.facebook`, `api.twitter`,
`api.x.com`, `upload.twitter` or `instagram.com/api` ever appears in a source file.

- Implementation: `<REPO>src/domain/ports.ts` (`SocialPublisher`),
  `<REPO>src/infrastructure/publishing/adapters.server.ts`,
  `<REPO>src/infrastructure/publishing/fake-platform-transport.server.ts`
- Endpoints: `POST|GET /api/public/fake-platform/$platform/posts` —
  `<REPO>src/routes/api/public/fake-platform/$platform/posts.ts`
- Tests: `tests/security.test.ts › no real social platform is ever called`,
  `tests/publishing-adapters.test.ts`, `tests/fake-platform-transport.test.ts`
- Screenshot: `docs/screenshots/04-fake-platform-state.png`

## DoD 5 — Idempotency: publish twice / retry after timeout → exactly one post

**Explanation.** Key `flyrank:{campaignId}:{platform}` is deterministic, unique in the database
per `(campaign_id, platform)`, sent as `Idempotency-Key` on every attempt, and de-duplicated by
the fake platform.

**Evidence.** Unit test proves determinism and per-platform uniqueness; the demo shows the fake
platform holding one post after repeated publishes.

- Implementation: `buildIdempotencyKey` in `<REPO>src/domain/entities.ts`;
  enforcement in `<REPO>src/application/publish-usecases.ts` and the fake platform route;
  DB constraint in `<REPO>supabase/migrations/`
- Endpoints: `publishCampaignFn`, `retryCampaignFn`;
  `GET /api/public/fake-platform/x/posts` to inspect
- Tests: `tests/domain.test.ts › publish reliability primitives › derives a deterministic
  idempotency key per (campaign, platform)`,
  `tests/publish-usecases.test.ts`
- Manual probe: *Publish now* ×3 → fake-platform state still lists one post per platform
- Screenshot: `docs/screenshots/05-idempotency.png`

## DoD 6 — Rate limiting: `429` + `Retry-After` honoured with backoff and attempt log

**Explanation.** The adapter honours `Retry-After` when present, otherwise applies exponential
backoff (5s floor, doubling, capped at 300s), stops at `MAX_PUBLISH_ATTEMPTS`, and records every
attempt with its HTTP status and retry delay.

**Evidence.**

```
✓ backoffSeconds(1)      === 5
✓ backoffSeconds(2)      === 10
✓ backoffSeconds(1, 42)  === 42     // Retry-After wins over the floor
✓ backoffSeconds(20)     <= 300     // capped
```

- Implementation: `backoffSeconds`, `MAX_PUBLISH_ATTEMPTS` in `<REPO>src/domain/entities.ts`;
  retry loop in `<REPO>src/application/publish-usecases.ts`; injectable 429s in the fake platform
- Endpoints: `setPlatformRateLimit` (demo control), `publishCampaignFn`
- Tests: `tests/domain.test.ts › publish reliability primitives › honours Retry-After above the
  exponential floor and caps growth`,
  `tests/publish-usecases.test.ts › attemptEntry`
- Manual probe: *Force 429 ×2* → publish → attempts drawer shows two `429`s then success
- Screenshot: `docs/screenshots/06-rate-limit-attempts.png`

## DoD 7 — Durable scheduling that survives a crash without duplicates

**Explanation.** Due entries are claimed with a short `lease_until` via a conditional `UPDATE`.
A worker that dies mid-batch leaves claims that expire and become claimable again; the replay
uses the same idempotency key, so the platform still ends up with one post.

**Evidence.** Lease/claim logic and the recovery path are isolated in the worker use case;
statuses are derived purely from entries.

- Implementation: `<REPO>src/application/worker.ts`,
  `deriveCampaignStatus` in `<REPO>src/domain/entities.ts`,
  claim query in `<REPO>src/infrastructure/persistence/supabase-repositories.server.ts`
- Endpoints: `scheduleCampaignFn`, `tickWorker`
- MCP tools: `schedule_campaign`, `campaign_status`
- Tests: `tests/domain.test.ts › publish reliability primitives › derives campaign status from
  its entries`,
  `tests/delivery-usecases.test.ts`
- Manual probe: schedule → tick → interrupt → tick again → one post, status resolves
- Screenshot: `docs/screenshots/07-scheduling-timeline.png`

## DoD 8 — Signature-verified delivery webhooks own the terminal status

**Explanation.** `published` / `failed` are written only by the delivery endpoint after
Stripe-style HMAC-SHA256 verification (`t=<unix>,v1=<hex>` over `"t.body"`), with a 300s replay
window and a timing-safe compare. A forged, tampered or stale webhook returns `400` and changes
nothing.

**Evidence.**

```
✓ accepts a correctly signed payload
✓ rejects a forged signature
✓ rejects a valid signature over a different body (tampering)
✓ rejects replays outside the timestamp tolerance
```

- Implementation: `<REPO>src/infrastructure/crypto/webhook-signature.server.ts`,
  `<REPO>src/application/delivery-usecases.ts`
- Endpoint: `POST /api/public/webhooks/delivery` —
  `<REPO>src/routes/api/public/webhooks/delivery.ts`
- Tests: `tests/security.test.ts › delivery webhook signatures` (4 tests),
  `tests/delivery-usecases.test.ts`
- Manual probe: fire a forged webhook → `400`, status unchanged; fire the genuine one →
  **Published**
- Screenshot: `docs/screenshots/08-webhook-log.png`

## DoD 9 — OAuth tokens encrypted at rest, never logged

**Explanation.** Tokens are stored as AES-256-GCM ciphertext with a fresh random 12-byte IV per
write and an appended auth tag. No plaintext token column exists in the schema, and a redaction
helper wraps anything token-shaped before logging.

**Evidence.**

```
✓ round-trips AES-256-GCM ciphertext
✓ uses a fresh IV per write
✓ rejects tampered ciphertext via the auth tag
✓ redacts token-shaped values for logging
```

- Implementation: `<REPO>src/infrastructure/crypto/token-cipher.server.ts`;
  `platform_credentials.access_token_ciphertext` in `<REPO>supabase/migrations/`
- Endpoint: fake OAuth token issuance in the fake-platform transport
- Tests: `tests/security.test.ts › token encryption at rest` (4 tests)
- Screenshot: `docs/screenshots/09-credentials-schema.png`

## DoD 10 — Tenant isolation, validation and clean architecture

**Explanation.** Email/password sign-in; every table is `user_id`-scoped with explicit
`GRANT`s, RLS policies and indexes. Every input is zod-validated at the boundary — bad input
returns `400`, never a 500. Dependencies point inward: `interfaces → application → domain`.

**Evidence.** Migrations show `ENABLE ROW LEVEL SECURITY` + policies + grants per table; the
domain layer imports no I/O module; use cases receive their adapters from a single composition
root.

- Implementation: `<REPO>supabase/migrations/`, `<REPO>src/routes/auth.tsx` (Supabase Auth),
  `<REPO>src/routes/_authenticated/route.tsx`,
  `<REPO>src/infrastructure/context.server.ts`, `<REPO>src/domain/ports.ts`
- Endpoints: all authenticated server functions in `<REPO>src/lib/flyrank.functions.ts`
- Tests: layering enforced by review + `ports.ts`; `tests/supabase-mappers.test.ts`,
  `tests/ingest-content.test.ts`
- Screenshot: `docs/screenshots/10-auth-and-rls.png`,
  `docs/screenshots/v2-19-auth-split-panel-fanned-cards.png`

## DoD 11 — Documentation and submission pack

- `README.md` — overview, architecture, features, stack, install, env, run, API, structure,
  tests, demo, decisions, limitations, future work
- `DECISIONS.md` — assumptions and senior-engineer calls, with the cost of changing each
- `BUILDLOG.md` — chronological engineering log
- `EVIDENCE.md` — this file
- `capstone.yaml` — submission metadata
- `.env.example` — every variable documented, no secrets
- `LICENSE` — MIT

## Enhancement — Standalone MCP interface (optional, in scope)

**Explanation.** A vendor-neutral MCP server exposes the campaign lifecycle to external
assistants. It is only another interface: no business logic, no caption generation, no model
calls of its own.

- Implementation: `<REPO>src/mcp/server.ts`, `<REPO>src/mcp/tools/*` (7 tools)
- Endpoints: `POST /api/public/mcp`, `GET /.well-known/oauth-protected-resource`,
  consent at `/oauth/consent`
- Tests: `tests/mcp-server.test.ts`, `tests/mcp-context.test.ts`
- Screenshot: `docs/screenshots/11-mcp-tools.png`

## Enhancement — Public landing page and auth (product polish)

**Explanation.** `/` is a marketing landing page with EN/TR i18n, scroll animations, hero
generation visuals and an AI Studio preview. `/auth` is a split layout: marketing panel with
fanned Instagram / X / LinkedIn preview cards and an email/password form (no Google button until
OAuth is enabled in Supabase). Landing, auth and dashboard share the same coral-forward OKLCH
token set in `src/styles.css`.

- Implementation: `<REPO>src/routes/index.tsx`, `<REPO>src/routes/auth.tsx`,
  `<REPO>src/components/landing/*`, `<REPO>src/components/auth/AuthPanelFan.tsx`,
  `<REPO>src/i18n/**`
- Screenshots:
  `docs/screenshots/v2-17-landing-hero-light.png`,
  `docs/screenshots/v2-17-landing-hero-dark.png`,
  `docs/screenshots/v2-18-landing-ai-studio-preview-and-stats.png`,
  `docs/screenshots/v2-19-auth-split-panel-fanned-cards.png`,
  `docs/screenshots/v2-20-locale-toggle-en-tr.png`

## DoD 12 — AI cost tracking and budget guard

**Explanation.** Every OpenAI call (captions, art director, image generation) records an
estimated USD cost attributed to a feature name. Spend is **persisted per user** in
`ai_usage_records` (Postgres + RLS) so totals survive page refresh and re-login. Before each
call, `canSpendAi()` checks cumulative spend against `AI_BUDGET_USD`; when the budget is
exhausted, the app falls back to the deterministic caption composer / SVG renderer without
calling the API. The dashboard shows spend via `AiSpendBadge` (header) and `AiSpendPanel`
(sidebar).

- Implementation: `<REPO>src/infrastructure/ai/ai-cost-meter.server.ts`,
  `<REPO>src/infrastructure/ai/ai-cost-meter-db.server.ts`, wired into
  `openai-caption-writer.server.ts`, `openai-art-director.server.ts`,
  `openai-image-generator.server.ts`
- Schema: `ai_usage_records` in `<REPO>supabase/migrations/20260807210000_add_ai_usage_records.sql`
- Config: `AI_BUDGET_USD` in `.env.example`
- Tests: `tests/ai-cost-meter.test.ts`, `tests/ai-spend-snapshot.test.ts`
- Screenshot: `docs/screenshots/13-ai-spend-observability-panel.png`

## DoD 13 — Automatic background worker

**Explanation.** On server boot, a background loop polls Postgres every
`WORKER_POLL_INTERVAL_MS` (default 10s) via `claim_due_entries` (service role) and
publishes due entries — scheduled posts fire without a manual dashboard tick.

- Implementation: `<REPO>src/infrastructure/worker/background-worker.server.ts`,
  `runGlobalWorkerTick` in `<REPO>src/application/worker.ts`, started from `<REPO>src/server.ts`
- Config: `WORKER_ENABLED`, `WORKER_POLL_INTERVAL_MS` in `.env.example`
- Tests: `tests/reliability-probes.test.ts` (crash-resume + idempotency probes)

## DoD 14 — Capstone acceptance probes (automated)

**Explanation.** PDF §12 probes 1–4 are covered deterministically (no live DB/network).

- Tests: `tests/reliability-probes.test.ts`
- Forged webhook HTTP status: `400` — `<REPO>src/routes/api/public/webhooks/delivery.ts`

## DoD 15 — LinkedIn platform (third adapter)

**Explanation.** LinkedIn follows the same adapter pattern as Instagram and X: platform spec
(`1200×627`), voice fragments, fake adapter, DB enum value, and one `SocialPostEntry` per
campaign.

- Implementation: `<REPO>src/config/platform-specs.ts`, `<REPO>src/infrastructure/publishing/adapters.server.ts`
- Schema: `linkedin` platform enum — `<REPO>supabase/migrations/20260807200000_add_linkedin_platform.sql`
- Tests: `tests/publishing-adapters.test.ts`, `tests/domain.test.ts › image geometry`
- Screenshot: `docs/screenshots/14-variant-gallery-carousel-three-platforms.png`
