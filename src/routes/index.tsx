import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PLATFORMS } from "@/config/platform-specs";
import type { BlogPost, ContentSocials, SocialPostEntry, WebhookLogEntry, WorkerLogEntry } from "@/lib/types";
import { ActionButton } from "@/components/campaign/ActionButton";
import { NewPostForm } from "@/components/campaign/NewPostForm";
import { DevPanel } from "@/components/campaign/DevPanel";
import { StatusChip } from "@/components/campaign/StatusChip";
import { VariantCard } from "@/components/campaign/VariantCard";

const TITLE = "FlyRank — Multi-Platform Social Campaign Engine";
const DESCRIPTION =
  "Turn one blog post into per-platform image variants and tailored captions, then publish or schedule through a durable, idempotent worker.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CampaignDashboard,
});

interface PreviewItem {
  platform: (typeof PLATFORMS)[number];
  caption: string;
  imageUrl: string;
}
type PostWithPreview = BlogPost & { preview: PreviewItem[] };

const json = async <T,>(url: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`${url} failed [${res.status}]: ${await res.text()}`);
  return (await res.json()) as T;
};

function CampaignDashboard() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [minutes, setMinutes] = useState(10);

  const postsQuery = useQuery({
    queryKey: ["posts"],
    queryFn: () => json<{ posts: PostWithPreview[] }>("/api/posts"),
  });
  const campaignsQuery = useQuery({
    queryKey: ["campaigns"],
    queryFn: () => json<{ campaigns: ContentSocials[] }>("/api/campaigns"),
    refetchInterval: 1500,
  });
  const logsQuery = useQuery({
    queryKey: ["logs"],
    queryFn: () =>
      json<{
        worker: WorkerLogEntry[];
        webhooks: WebhookLogEntry[];
        clockOffsetMs: number;
        force429: number;
        platformPostCount: number;
      }>("/api/logs"),
    refetchInterval: 1500,
  });

  const posts = postsQuery.data?.posts ?? [];
  const selected = posts.find((p) => p.id === selectedId) ?? posts[0];
  const activeId = selected?.id ?? null;
  const campaign = campaignsQuery.data?.campaigns.find((c) => c.post.id === activeId);
  const entryFor = (platform: string): SocialPostEntry | undefined =>
    campaign?.entries.find((e) => e.platform === platform);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["campaigns"] });
    void qc.invalidateQueries({ queryKey: ["logs"] });
  };

  const post = (url: string, body?: unknown) =>
    json(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

  const makeCampaign = useMutation({
    mutationFn: () => post("/api/campaigns", { postId: activeId }),
    onSuccess: invalidate,
  });
  const publishNow = useMutation({
    mutationFn: () => post(`/api/campaigns/${activeId}/publish`),
    onSuccess: invalidate,
  });
  const schedule = useMutation({
    mutationFn: () =>
      post(`/api/campaigns/${activeId}/schedule`, {
        scheduledFor: new Date(Date.now() + minutes * 60_000).toISOString(),
      }),
    onSuccess: invalidate,
  });
  const devAction = useMutation({
    mutationFn: (body: Record<string, unknown>) => post("/api/dev", body),
    onSuccess: invalidate,
  });

  const busy =
    makeCampaign.isPending || publishNow.isPending || schedule.isPending || devAction.isPending;
  const hasCampaign = Boolean(campaign?.entries.length);

  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-4 px-6 py-8">
          <div>
            <p className="eyebrow">FlyRank · campaign layer</p>
            <h1 className="mt-2 text-4xl font-bold">Social Campaign Engine</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{DESCRIPTION}</p>
          </div>
          <div className="panel px-4 py-3 text-right font-mono text-[11px] text-muted-foreground">
            <div>sandbox: fake-platform only</div>
            <div>fake posts delivered: {logsQuery.data?.platformPostCount ?? 0}</div>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[300px_1fr]">
        <aside className="flex flex-col gap-4">
          <section className="panel p-4">
            <h2 className="eyebrow">Blog posts</h2>
            <ul className="mt-3 flex flex-col gap-2">
              {posts.map((p) => {
                const active = p.id === activeId;
                return (
                  <li key={p.id}>
                    <button
                      onClick={() => setSelectedId(p.id)}
                      className={`w-full rounded-lg border px-3 py-3 text-left transition-colors ${
                        active
                          ? "border-accent-strong/70 bg-surface-raised"
                          : "border-border hover:border-accent-strong/40"
                      }`}
                    >
                      <span className="block text-sm font-semibold leading-snug">{p.title}</span>
                      <span className="mt-1 block font-mono text-[11px] text-muted-foreground">{p.id}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>



          <section className="panel flex flex-col gap-3 p-4">
            <h2 className="eyebrow">Actions</h2>
            <ActionButton variant="primary" disabled={busy || !activeId} onClick={() => makeCampaign.mutate()}>
              Make campaign
            </ActionButton>
            <ActionButton disabled={busy || !hasCampaign} onClick={() => publishNow.mutate()}>
              Publish now
            </ActionButton>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={1440}
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value))}
                className="w-20 rounded-lg border border-input bg-background px-2 py-2 text-sm"
                aria-label="Minutes from now"
              />
              <ActionButton
                className="flex-1"
                disabled={busy || !hasCampaign}
                onClick={() => schedule.mutate()}
              >
                Schedule +{minutes}m
              </ActionButton>
            </div>
          </section>

          <section className="panel p-4">
            <h2 className="eyebrow">Campaign status</h2>
            <ul className="mt-3 flex flex-col gap-2">
              {(campaign?.entries ?? []).map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="capitalize">{e.platform}</span>
                  <StatusChip status={e.status} />
                </li>
              ))}
              {!hasCampaign ? (
                <li className="text-xs text-muted-foreground">No entries yet — make a campaign.</li>
              ) : null}
            </ul>
          </section>
        </aside>

        <div className="flex flex-col gap-6">
          <section>
            <div className="flex items-baseline justify-between">
              <h2 className="text-2xl font-bold">{selected?.title ?? "Select a post"}</h2>
              <a
                href={selected?.url}
                className="font-mono text-[11px] text-muted-foreground underline-offset-4 hover:underline"
              >
                {selected?.url}
              </a>
            </div>
            <div className="mt-4 grid gap-5 lg:grid-cols-2">
              {(selected?.preview ?? []).map((item) => (
                <VariantCard
                  key={item.platform}
                  platform={item.platform}
                  caption={entryFor(item.platform)?.caption ?? item.caption}
                  imageUrl={item.imageUrl}
                  entry={entryFor(item.platform)}
                />
              ))}
            </div>
          </section>

          <DevPanel
            postId={hasCampaign ? activeId : null}
            busy={busy}
            clockOffsetMs={logsQuery.data?.clockOffsetMs ?? 0}
            force429={logsQuery.data?.force429 ?? 0}
            onAction={(body) => devAction.mutate(body)}
          />

          <div className="grid gap-5 lg:grid-cols-2">
            <section className="panel p-4">
              <h2 className="eyebrow">Worker log</h2>
              <ul className="mt-3 flex max-h-64 flex-col gap-1.5 overflow-auto font-mono text-[11px]">
                {(logsQuery.data?.worker ?? []).map((l) => (
                  <li
                    key={l.id}
                    className={
                      l.level === "error"
                        ? "text-status-failed"
                        : l.level === "warn"
                          ? "text-status-publishing"
                          : "text-muted-foreground"
                    }
                  >
                    {new Date(l.at).toLocaleTimeString()} · {l.message}
                  </li>
                ))}
              </ul>
            </section>

            <section className="panel p-4">
              <h2 className="eyebrow">Webhook log</h2>
              <ul className="mt-3 flex max-h-64 flex-col gap-1.5 overflow-auto font-mono text-[11px]">
                {(logsQuery.data?.webhooks ?? []).map((w) => (
                  <li key={w.id} className={w.verified ? "text-status-published" : "text-status-failed"}>
                    {new Date(w.receivedAt).toLocaleTimeString()} · {w.status} · {w.message}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
