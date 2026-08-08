# DECISIONS.md

Assumptions and senior-engineer calls made while building **CampaignHub Studio**
(the FlyRank capstone). Each entry states the decision, why, and what it would cost to change.

## D1 — Backend: TanStack Start server functions, not Express/Fastify
The project is a TanStack Start (React 19 + Vite 7) app and the brief requires a
Node/TypeScript API. A second HTTP process would mean two deploy targets and CORS for no
functional gain. App-internal calls use typed server functions
(`src/lib/flyrank.functions.ts`); external callers (fake platform, delivery webhook, MCP)
use file-based server routes under `src/routes/api/public/**`, which are plain
`Request → Response` handlers. Lifting them into Fastify later is mechanical.

## D2 — Persistence: Postgres with RLS, not a local file store
The prototype used a JSON-file store. Tenant isolation is a graded requirement and the
lease/claim scheduler wants real transactional `UPDATE`s, so persistence moved to Postgres
behind repository ports (`src/domain/ports.ts`,
`src/infrastructure/persistence/supabase-repositories.server.ts`). Schema, grants, RLS
policies and indexes ship as migrations in `supabase/migrations/`. Swapping the database
touches one folder; no use case imports a driver.

## D3 — Images: sharp primary, Jimp fallback, no custom encoder
No hand-rolled PNG encoder. `sharp` rasterises the shared SVG composition wherever a native
Node runtime exists (local dev, Docker, tests); `Jimp` (pure JS) covers the serverless Worker
target, where sharp's native binary cannot load. Both consume the same pure geometry
(`computeVariantGeometry`, `fitSubjectToSafeZone`), so dimensions are identical by
construction. Tests decode the PNG IHDR chunk rather than trusting library metadata.

## D4 — Status transitions are webhook-owned, with one documented exception
`published` / `failed` are written exclusively by `/api/public/webhooks/delivery` after HMAC
verification. The exception: if the adapter exhausts `MAX_PUBLISH_ATTEMPTS` and the platform
never accepted the post, no webhook will ever arrive, so the worker marks the row `failed`
locally. Leaving it `queued` forever would be a silent stuck row.

## D5 — Extra `publishing` status
The brief's model is `queued → published | failed`. A worker needs a distinct in-flight state
to hold a lease, so `publishing` was added. It is never terminal: the webhook moves it on, and
an expired lease returns the row to the claimable pool.

## D6 — Idempotency key is deterministic, not random
`flyrank:{campaignId}:{platform}`, enforced by `UNIQUE (campaign_id, platform)` in the database
and by the fake platform. A random key would make a post-crash replay look like a new publish.
Deterministic keys collapse replay, retry and UI spam into one remote post.

## D7 — Captions: LLM with a deterministic fallback
Captions are written by OpenAI `gpt-4o-mini` using the existing prompt-fragment architecture
(shared brand voice + per-platform overrides in `src/config/social-prompts.config.ts`), not a
duplicated prompt string. A 15-second timeout and a catch-all delegate to the deterministic
composer on missing key, timeout, rate limit or any API error — campaign creation never fails
because the model is unavailable. The deterministic path is what the test suite pins, so the
graded behaviour stays reproducible.

## D8 — Blog sources: real published articles, plus paste/upload
The brief says "given a published post". Rather than invent seed data, the Blog library pulls
real published articles (Anthropic, Google DeepMind, Cloudflare) and enriches previews with
Open Graph metadata behind an in-memory cache. Users can still paste text or upload
`.md` / `.pdf` / `.docx`. Replacing or extending sources is one file:
`src/infrastructure/feeds/blog-library.server.ts`.

## D9 — Secrets and OAuth credentials
The fake platform issues tokens for any non-empty client id/secret. Tokens are stored
AES-256-GCM encrypted with a fresh random IV per write
(`src/infrastructure/crypto/token-cipher.server.ts`); no plaintext token column exists. When
`TOKEN_ENCRYPTION_KEY` / `WEBHOOK_SIGNING_SECRET` are absent, a clearly-labelled dev fallback is
derived so the sandbox boots without secrets; both belong in `.env` for any real deployment.

## D10 — Adapter boundary enforced by folder + review, not a lint rule
Only `src/infrastructure/publishing/**` performs platform I/O; everything else depends on the
`SocialPublisher` port. This is documented in `src/domain/ports.ts` and pinned by a test that
scans `src/` for real platform endpoints. A dependency-cruiser rule was considered and skipped
as extra tooling for a two-adapter codebase.

## D11 — Demo controls are gated, not stripped
Force-429 and worker-tick controls exist in one place and are disabled outside development
unless `ENABLE_DEV_PANEL=true`, so a real deployment cannot trigger them by accident.

## D12 — MCP is vendor-neutral and interface-only
The first MCP implementation used a platform SDK and generated routes, which coupled a
"standalone" server to the build platform. It was replaced with a hand-rolled JSON-RPC 2.0
server (`src/mcp/`) depending only on `zod` + `zod-to-json-schema`, transported over
`POST /api/public/mcp` with bearer verification and RLS-scoped queries. Every tool delegates to
an existing use case: the MCP layer holds no business logic, generates no captions and calls no
model.

## D14 — Standalone Supabase, not Lovable Cloud
The app connects to a **self-hosted Supabase project** via `.env` (`SUPABASE_URL`,
`SUPABASE_PUBLISHABLE_KEY`, `VITE_*` mirrors, `SUPABASE_SERVICE_ROLE_KEY` for server-only
work). Schema ships in `supabase/migrations/` and is applied manually in the Supabase SQL
Editor. Google OAuth uses `supabase.auth.signInWithOAuth` directly; Lovable Cloud auth is no
longer on the sign-in path. MCP OAuth discovery reads `VITE_SUPABASE_PROJECT_ID` to point
clients at `https://<ref>.supabase.co/auth/v1`.

## D13 — Stretch goals not started
Real-platform integration, brand templating, A/B captions, analytics loopback and the approval
workflow are untouched by design. The MCP interface and document import were included because
both are thin layers over existing use cases and are sanctioned by the brief.

## D15 — AI spend persisted per user, not in-process only
Session-only spend counters reset on server restart and could not survive a dashboard refresh.
`ai_usage_records` stores one row per OpenAI call (feature, model, tokens, estimated USD) under
RLS; `createDbAiCostMeter` is wired at the composition root. If the table is missing, the meter
falls back to an empty in-memory ledger so `loadDashboard` never 500s — apply
`supabase/migrations/20260807210000_add_ai_usage_records.sql` for full persistence.

## D16 — Background worker on server boot
The capstone requires durable scheduling; a manual dashboard tick is insufficient for demos.
`runGlobalWorkerTick` runs on an interval from `src/server.ts` using the service-role client,
claiming due rows across tenants. Disable with `WORKER_ENABLED=false` for tests or manual-only
runs.

## D18 — Unified public shell palette (landing, auth, dashboard)
Marketing landing and auth wrap content in `landing-page` / `landing-dark` with coral-forward
OKLCH tokens. Dashboard `:root` and `html.light` were aligned to the same token block so
`bg-primary`, `bg-surface` and borders match without per-screen hardcoded colours. Theme
persistence still uses two keys (`campaignhub-landing-theme` on `/` and `/auth`,
`campaignhub-theme` on the dashboard toggle) — colours match; preference is not yet synced
across routes.

## D17 — LinkedIn as a third fake adapter
LinkedIn was added using the same port/adapter/registry pattern as Instagram and X — one spec
entry, one voice block, one `LinkedInFakeAdapter`, one enum migration. No application use case
imports LinkedIn-specific types.
