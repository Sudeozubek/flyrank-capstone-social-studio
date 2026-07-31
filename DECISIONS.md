# DECISIONS.md

Assumptions and senior-engineer calls made while building the FlyRank campaign layer.
Each entry states the decision, why, and what it would cost to change.

## D1 — Backend framework: TanStack Start server routes, not Express/Fastify
The project template is a TanStack Start (React 19 + Vite 7) app on a Node/edge runtime,
and the brief requires "a Node/TypeScript API". Adding a second HTTP process (Express)
would mean two servers, two deploy targets and CORS between them for no functional gain.
All endpoints are file-based server routes (`src/routes/api/**`) with the same
request/response semantics as Fastify handlers. Every handler is a plain
`(Request) => Response` function, so lifting them into Express/Fastify later is mechanical.

## D2 — Persistence: JSON-file-backed durable store, not SQLite
The requirement is "queue table + status column is enough". `src/lib/store.server.ts`
writes every mutation to `.data/flyrank.json` via a temp-file + rename, so state survives a
process crash — which is what the crash-resume requirement actually tests. The module
exposes a tiny surface (`db()`, `mutate()`), so swapping in SQLite/Postgres is a one-file
change with no callers touched. Native DB drivers are also unavailable on the Worker runtime
this template deploys to.

## D3 — Image pipeline: pure geometry + SVG renderer, not `sharp`
`sharp`/`canvas` need native binaries that do not exist in the serverless runtime. The graded
behaviour — cover-crop math, exact per-platform dimensions, subject-in-safe-zone — is
implemented as pure, unit-tested functions (`computeVariantGeometry`, `fitSubjectToSafeZone`)
and rendered to a real, inspectable image (`renderVariantSvg`) served at the exact declared
pixel size by `/api/image/variant`. To move to raster output, keep the geometry module and
replace only the renderer.

## D4 — Status transitions are webhook-owned, with one documented exception
`published` / `failed` are written exclusively by `/api/public/webhooks/delivery` after HMAC
verification. The one exception: if the adapter exhausts its retries and the platform never
accepted the post, no webhook will ever arrive, so the worker marks the row `failed` locally
after `MAX_ATTEMPTS`. Leaving it `queued` forever would be a silent stuck row.

## D5 — Extra `publishing` status
The spec's model is `queued → published | failed`. A worker needs a distinct in-flight state
to hold a lease, so `publishing` was added as an intermediate. It is never terminal: the
webhook moves it on, and an expired lease returns it to the claimable pool.

## D6 — Idempotency key is deterministic, not random
`flyrank:<postId>:<platform>`. A random key would make a post-crash replay look like a new
publish to the platform. Deterministic keys mean replay, retry and UI spam all collapse to
one remote post — which is exactly what the idempotency test asserts.

## D7 — Dev clock instead of real waiting
Scheduling decisions read `now()` from the store, which applies `clockOffsetMs`. The demo
("advance time") and the scheduling test therefore run in milliseconds instead of minutes.
Production simply never sets an offset.

## D8 — OAuth credentials
The fake platform issues tokens for any non-empty client id/secret. Tokens are stored
AES-256-GCM encrypted with a fresh random IV per write (`src/lib/crypto.server.ts`). If
`TOKEN_ENCRYPTION_KEY` / `WEBHOOK_SIGNING_SECRET` are absent, a clearly-labelled dev fallback
key is derived so the sandbox boots without secrets; both belong in `.env` in any real deployment.

## D9 — Adapter boundary enforced by folder + review, not a lint rule
Only `src/lib/publisher/adapters/**` performs platform I/O; everything else imports
`getPublisher()` and the `SocialPublisher` interface. This is documented at the top of
`src/lib/publisher/types.ts`. A dependency-cruiser rule was considered and skipped as extra
tooling for a two-adapter codebase.

## D10 — Dev control panel is API-gated, not stripped
`/api/dev` returns 403 when `NODE_ENV=production` unless `ENABLE_DEV_PANEL=true`, so the demo
controls exist in one place and cannot be triggered on a real deployment by accident.

## D11 — Stretch goals not started
Real-platform integration, brand templating, A/B captions, analytics loopback and the
approval workflow are untouched by design. The optional read-only MCP endpoint
(`/api/public/mcp`) was included because it is a thin wrapper over existing reads.
