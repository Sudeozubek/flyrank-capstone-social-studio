# Screenshots

Reviewer-facing evidence images referenced by [`../../EVIDENCE.md`](../../EVIDENCE.md).
Capture each one from a running instance (`npm run dev` → http://localhost:8080) and drop it
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
| `12-dashboard-blog-library-and-campaign-variants.png` | Full dashboard: blog library composer, brand context, and a draft campaign with Instagram + X captions and AI image variants |
| `13-ai-spend-observability-panel.png` | Sidebar AI spend panel: session budget, progress bar, recent OpenAI calls (caption / art direction / image) |
| `14-variant-gallery-carousel-three-platforms.png` | Campaign variant carousel: Instagram slide with image + Turkish caption; platform tabs for Instagram, X, LinkedIn |
| `15-brand-tone-selector.png` | New campaign composer — brand tone dropdown (Friendly, Professional, Playful, …) |
| `16-campaign-language-selector.png` | New campaign composer — output language dropdown (English, Türkçe, Deutsch, Bosanski, Français, العربية) |
