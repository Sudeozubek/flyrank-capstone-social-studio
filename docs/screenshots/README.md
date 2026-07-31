# Screenshots

Reviewer-facing evidence images referenced by [`../../EVIDENCE.md`](../../EVIDENCE.md).
Capture each one from a running instance (`bun run dev` → http://localhost:8080) and drop it
here with the exact filename.

| File | What to capture |
| --- | --- |
| `01-campaign-variants.png` | A campaign detail view with both platform entries side by side |
| `02-image-variants.png` | Instagram 1080×1080 and X 1600×900 variants with dimension badges |
| `03-caption-comparison.png` | The two captions next to each other, showing structural divergence |
| `04-fake-platform-state.png` | `GET /api/public/fake-platform/x/posts` JSON response |
| `05-idempotency.png` | Fake-platform state after publishing the same campaign three times |
| `06-rate-limit-attempts.png` | Attempts drawer showing 429s with the honoured Retry-After |
| `07-scheduling-timeline.png` | Status timeline moving queued → publishing → published |
| `08-webhook-log.png` | Webhook log with one rejected (400) and one accepted delivery |
| `09-credentials-schema.png` | `platform_credentials` row showing only ciphertext |
| `10-auth-and-rls.png` | Sign-in screen and/or a migration excerpt with RLS policies |
| `11-mcp-tools.png` | `tools/list` response from `POST /api/public/mcp` |
