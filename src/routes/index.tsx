import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FlyRank — multi-platform social campaign publisher" },
      {
        name: "description",
        content:
          "Turn one blog post into platform-native captions and image variants, then publish them through a durable, idempotent, webhook-confirmed pipeline.",
      },
      { property: "og:title", content: "FlyRank — social campaign publisher" },
      {
        property: "og:description",
        content: "Captions, image variants, durable scheduling and signed delivery webhooks.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    title: "Platform-native assets",
    body: "One post fans out into a 1080×1080 Instagram variant and a 1600×900 X variant, each with its own voice, length and hashtag budget.",
  },
  {
    title: "Idempotent publishing",
    body: "Every attempt carries a deterministic idempotency key, so retries, duplicate leases and crashes never create a second remote post.",
  },
  {
    title: "Durable scheduling",
    body: "Due work is claimed with database leases (FOR UPDATE SKIP LOCKED). Kill the worker mid-flight and the schedule still lands.",
  },
  {
    title: "Signed delivery",
    body: "HMAC-signed webhooks are the only writer of terminal status, with a full audit trail of attempts and signature checks.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="font-display text-lg text-foreground">FlyRank</span>
          <Link
            to="/auth"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Open the studio
          </Link>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-6 py-24">
          <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-muted-foreground">
            Multi-platform campaign engine
          </p>
          <h1 className="mt-5 max-w-3xl font-display text-5xl leading-[1.05] text-foreground">
            Publish one blog post everywhere — without duplicate posts, lost schedules or
            guessed crops.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground">
            FlyRank generates platform-specific captions and correctly framed image variants,
            then drives them through a publishing pipeline built for real failure modes:
            rate limits, retries, crashes and asynchronous delivery confirmation.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              to="/auth"
              className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Start a campaign
            </Link>
            <a
              href="https://modelcontextprotocol.io"
              className="rounded-md border border-input px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              MCP orchestration
            </a>
          </div>
        </section>

        <section className="border-t border-border bg-surface">
          <div className="mx-auto grid max-w-6xl gap-px bg-border px-6 py-0 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <article key={feature.title} className="bg-surface p-8">
                <h2 className="font-display text-xl text-foreground">{feature.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {feature.body}
                </p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-8 font-mono text-[11px] text-muted-foreground">
          FlyRank capstone · publishes only to the bundled fake platform
        </div>
      </footer>
    </div>
  );
}
