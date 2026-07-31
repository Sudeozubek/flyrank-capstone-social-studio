# BUILDLOG.md

Engineering log for **CampaignHub Studio** (FlyRank capstone). Chronological, condensed to the
decisions and problems that actually shaped the code.

---

## Phase 0 — Prototype (Wk3 scaffold)

**Goal:** prove the shape of the system end to end before investing in infrastructure.

- Modelled the two platform specs (Instagram `1080×1080`, X `1600×900`) as a single source of
  truth in `src/config/platform-specs.ts`, including safe zones, caption limits and hashtag
  budgets. Everything downstream — geometry, captions, UI badges — reads from it.
- Wrote the crop/safe-zone maths as pure functions so it could be unit-tested with no runtime.
- Built a JSON-file-backed store, a fake platform, two adapters behind a `SocialPublisher`
  interface, a lease-based worker, HMAC webhooks and AES-256-GCM token encryption.
- Shipped a dashboard with polling status chips and a dev control rail.

**Trade-off taken knowingly:** a file store and an SVG-only image path. Both were fast to build
and both were later identified as the weakest parts of the submission.

## Phase 1 — Re-reading the brief, replanning against the capstone

Re-derived the requirements from the capstone PDF and listed the gaps honestly: no migrations,
no auth, no tenant isolation, images were SVG rather than real raster artifacts, MCP was a
hand-rolled JSON-RPC afterthought, and business logic lived in route files.

**Decision: rebuild on Clean Architecture.** `domain` (entities, pure logic, ports) →
`application` (use cases) → `infrastructure` (adapters) → `interfaces` (routes, MCP, UI). The
dependency rule became the review checklist: if a use case imports Postgres, `sharp` or `fetch`,
the change is wrong.

## Phase 2 — Persistence, auth and tenancy

- Seven tables via SQL migrations: `profiles`, `blog_posts`, `campaigns`,
  `social_post_entries`, `platform_credentials`, `publish_attempts`, `webhook_events`.
- Each table: explicit `GRANT`s → `ENABLE ROW LEVEL SECURITY` → policies scoped to `auth.uid()`
  → indexes for the hot paths (`(user_id, created_at desc)`, `(status, scheduled_for)`).
- `UNIQUE (campaign_id, platform)` made idempotency a database invariant rather than a
  convention.
- No plaintext token column exists: credentials store `access_token_ciphertext` only.

**Challenge:** email confirmation blocked sign-in during the demo loop, and the sign-in button
appeared inert. Two separate causes — the toast host was never mounted (so failures were
silent), and a redundant `onAuthStateChange` listener raced the redirect. Fixed by mounting
`<Toaster />` once in the root route and letting a single code path own post-auth navigation.

## Phase 3 — Real images, real documents

- **Removed the custom TypeScript PNG encoder.** `sharp` became the primary renderer,
  rasterising the shared SVG composition. The deployment target is a serverless Worker where
  sharp's native binary cannot load, so `Jimp` renders the same geometry there.
- Both renderers consume the *same* pure composition, so dimensions are identical by
  construction. The test decodes the PNG IHDR chunk directly rather than trusting a library's
  metadata.
- Document ingestion behind a `DocumentParser` port: markdown, `unpdf` for PDFs, `mammoth` for
  DOCX, all normalising to `{ title, body, url }` with zod validation at the boundary.

## Phase 4 — Where do the blog posts come from?

The brief says "given a published post". Three options were considered: fixed seed data,
user-authored content, or real published articles. Settled on a **Blog library** that fetches
real published articles (Anthropic, Google DeepMind, Cloudflare) so campaigns run against
genuine content, with paste/upload still available.

**Challenges:** one source blocked scraping and was swapped out; another returned listings
without summaries. Added an Open Graph enrichment pass with an in-memory cache so preview cards
carry the article's real image and a real description instead of "Published on …" filler.

**UI iteration:** a three-column responsive grid, source filter, six cards before scroll, and
explicit `Select` (toggleable) / `Open` actions per card.

## Phase 5 — Reliability: idempotency, 429s, leases, webhooks

- Idempotency key `flyrank:{campaignId}:{platform}` — deterministic on purpose. A random key
  would make a post-crash replay look like a brand-new publish.
- `429` handling honours `Retry-After` when present and otherwise falls back to exponential
  backoff with a 5s floor and a 300s cap; attempts are capped and each one is persisted.
- Durable scheduling: due rows are claimed with a short `lease_until` via a conditional
  `UPDATE`. A crashed worker's claims expire and are replayed under the same key — so recovery
  is safe by construction rather than by cleanup logic.
- Terminal status is webhook-owned. One documented exception: after `MAX_PUBLISH_ATTEMPTS` with
  no platform acceptance, no webhook will ever arrive, so the worker marks the row `failed`
  locally rather than leaving a silent stuck row.
- Webhook verification is Stripe-style (`t=…,v1=…` over `"t.body"`), with a replay window and a
  timing-safe compare.

## Phase 6 — Captions: deterministic → LLM → deterministic fallback

The deterministic composer produced structurally-divergent captions but read mechanically.
Swapped in OpenAI `gpt-4o-mini` while **keeping the prompt-fragment architecture** — shared
brand voice plus per-platform overrides — so the model receives composed instructions rather
than a duplicated prompt string.

**Hard requirement that shaped the code:** campaign creation must never fail because the model
is unavailable. Added a 15-second timeout and a catch-all that delegates to the deterministic
composer on missing key, timeout, rate limit or any API error. The fallback path is the one the
test suite pins, so the graded behaviour stays deterministic.

## Phase 7 — Product polish and rebrand

- Renamed the product to **CampaignHub Studio** with the positioning line "Transform a single
  blog post into a complete multi-platform social campaign."
- Added optional **Brand name** and **Brand tone** campaign inputs, threaded through to caption
  generation and image branding.
- Added campaign deletion and manual caption editing (`CampaignEditDialog`).
- Replaced the browser `confirm()` on delete with an optimistic delete plus a 10-second Sonner
  undo toast — the row disappears immediately, the server call only fires when the window
  closes.
- Light/dark theme toggle backed by semantic OKLCH tokens; no hardcoded colours in components.

## Phase 8 — MCP as an interface, deliberately vendor-neutral

First implementation used a vendor SDK and generated routes. That coupled the "standalone"
server to the build platform, which contradicted the requirement, so it was removed:
package, plugin, generated routes and manifest all deleted.

The replacement depends only on `zod` + `zod-to-json-schema`:

- `src/mcp/server.ts` — JSON-RPC 2.0 dispatcher (`initialize`, `tools/list`, `tools/call`)
- `src/mcp/tools/*` — 7 thin delegates: `create_campaign`, `list_campaigns`, `get_campaign`,
  `campaign_status`, `schedule_campaign`, `publish_campaign`, `retry_campaign`
- `POST /api/public/mcp` — stateless transport with Bearer verification; every query runs under
  the caller's RLS scope
- `/.well-known/oauth-protected-resource` (RFC 9728) + `/oauth/consent`

No tool generates captions, writes posts or calls a model. Each one calls the same use case the
dashboard calls.

## Phase 9 — Tests and the submission pack

Added three deterministic Vitest suites (20 tests, no network, no database):

- `tests/domain.test.ts` — geometry, safe zones, aspect ratio, caption divergence and budgets,
  idempotency keys, backoff, status derivation
- `tests/imaging.test.ts` — real PNG bytes at exact platform dimensions, decoded from IHDR
- `tests/security.test.ts` — AES-256-GCM round-trip/IV freshness/tamper rejection, webhook
  accept/forge/tamper/replay, and a repo-wide scan proving no real platform endpoint exists

Then wrote the submission pack: `README.md`, `EVIDENCE.md`, `BUILDLOG.md`, `capstone.yaml`,
`.env.example`, MIT `LICENSE`, and refreshed `DECISIONS.md` so it describes the final Postgres +
sharp implementation rather than the prototype.

## Final notes

**What the architecture bought.** Swapping the store (file → Postgres) and the renderer
(SVG-only → sharp/Jimp) touched one folder each and no use case. Adding the MCP interface
required zero new business logic.

**Known trade-offs, stated plainly.** The fake platform's memory is process-local by design.
The image composition is generated artwork, not a photo pipeline. PDF extraction is text-only.
Blog-library previews depend on third-party sites staying reachable. Only Instagram and X are
implemented.

**Stretch goals not started, by design:** real-platform integration, brand templating, A/B
captions, analytics loopback, approval workflow.
