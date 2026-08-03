import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { DEFAULT_CAMPAIGN_LANGUAGE } from "@/config/campaign-languages.config";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { CampaignComposer, type ComposerSubmit } from "@/components/campaign/CampaignComposer";
import { CampaignEditDialog, type CampaignEdit } from "@/components/campaign/CampaignEditDialog";
import { StatusChip } from "@/components/campaign/StatusChip";
import { ThemeToggle } from "@/components/campaign/ThemeToggle";
import { VariantCard } from "@/components/campaign/VariantCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import {
  createCampaignWithAssets,
  createCampaignFromLibrary,
  listBlogLibrary,
  createPostFromText,
  createPostFromUpload,
  deleteCampaignFn,
  loadDashboard,
  publishCampaignFn,
  regenerateCaptions,
  regenerateImages,
  retryCampaignFn,
  scheduleCampaignFn,
  setPlatformRateLimit,
  tickWorker,
  updateCampaignFn,
} from "@/lib/flyrank.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "CampaignHub Studio" },
      {
        name: "description",
        content:
          "Generate captions and image variants from a blog post, schedule them, and watch the durable publish pipeline confirm delivery.",
      },
      { property: "og:title", content: "CampaignHub Studio" },
      {
        property: "og:description",
        content: "Durable, idempotent multi-platform social publishing.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function localIsoInMinutes(minutes: number): string {
  const d = new Date(Date.now() + minutes * 60_000 - new Date().getTimezoneOffset() * 60_000);
  return d.toISOString().slice(0, 16);
}

function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const load = useServerFn(loadDashboard);
  const [busy, setBusy] = useState(false);
  const [scheduleAt, setScheduleAt] = useState(localIsoInMinutes(2));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Record<string, ReturnType<typeof setTimeout>>>({});

  const dashboard = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => load(),
    refetchInterval: 4000,
  });

  const fns = {
    createText: useServerFn(createPostFromText),
    fromLibrary: useServerFn(createCampaignFromLibrary),
    createUpload: useServerFn(createPostFromUpload),
    createCampaign: useServerFn(createCampaignWithAssets),
    captions: useServerFn(regenerateCaptions),
    images: useServerFn(regenerateImages),
    schedule: useServerFn(scheduleCampaignFn),
    publish: useServerFn(publishCampaignFn),
    retry: useServerFn(retryCampaignFn),
    tick: useServerFn(tickWorker),
    rateLimit: useServerFn(setPlatformRateLimit),
    update: useServerFn(updateCampaignFn),
    remove: useServerFn(deleteCampaignFn),
  };

  const libraryFn = useServerFn(listBlogLibrary);
  const library = useQuery({
    queryKey: ["blog-library"],
    queryFn: () => libraryFn(),
    staleTime: 10 * 60 * 1000,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["dashboard"] });

  async function run<T>(label: string, action: () => Promise<T>) {
    setBusy(true);
    try {
      const result = await action();
      await refresh();
      toast.success(label);
      return result;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : label + " failed");
      return undefined;
    } finally {
      setBusy(false);
    }
  }

  const compose = useMutation({
    mutationFn: async (input: ComposerSubmit) => {
      if (input.mode === "library") {
        return fns.fromLibrary({
          data: {
            url: input.url!,
            ...(input.campaignName ? { name: input.campaignName } : {}),
            brandName: input.brandName?.trim() || null,
            brandTone: input.brandTone?.trim() || null,
            brandLanguage: input.brandLanguage || DEFAULT_CAMPAIGN_LANGUAGE,
          },
        });
      }
      const post =
        input.mode === "paste"
          ? await fns.createText({
              data: {
                body: input.body!,
                ...(input.title ? { title: input.title } : {}),
                url: input.url ?? null,
              },
            })
          : await fns.createUpload({
              data: {
                kind: input.file!.kind,
                filename: input.file!.filename,
                base64: input.file!.base64,
                url: input.url ?? null,
              },
            });
      return fns.createCampaign({
        data: {
          postId: post.id,
          brandName: input.brandName?.trim() || null,
          brandTone: input.brandTone?.trim() || null,
          brandLanguage: input.brandLanguage || DEFAULT_CAMPAIGN_LANGUAGE,
        },
      });
    },
    onSuccess: async () => {
      await refresh();
      toast.success("Campaign generated with captions and image variants");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not create the campaign"),
  });

  /** Soft-delete with a 10s undo window: hide locally, commit when the toast expires. */
  function requestDelete(campaignId: string, name: string) {
    const timer = setTimeout(() => {
      setPendingDelete(({ [campaignId]: _removed, ...rest }) => rest);
      void run("Campaign deleted", () => fns.remove({ data: { campaignId } }));
    }, 10_000);

    setPendingDelete((current) => ({ ...current, [campaignId]: timer }));

    toast(`"${name}" deleted`, {
      description: "Removing in 10 seconds.",
      duration: 10_000,
      action: {
        label: "Undo",
        onClick: () => {
          clearTimeout(timer);
          setPendingDelete(({ [campaignId]: _removed, ...rest }) => rest);
        },
      },
    });
  }

  async function saveEdit(edit: CampaignEdit) {
    const done = await run("Campaign updated", () =>
      fns.update({
        data: {
          campaignId: edit.campaignId,
          name: edit.name,
          brandName: edit.brandName.trim() || null,
          brandTone: edit.brandTone.trim() || null,
          brandLanguage: edit.brandLanguage || DEFAULT_CAMPAIGN_LANGUAGE,
          captions: edit.captions,
        },
      }),
    );
    if (done) setEditingId(null);
  }

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/auth", search: { mode: "signin" as const }, replace: true });
  }

  const allCampaigns = dashboard.data?.campaigns ?? [];
  const campaigns = allCampaigns.filter((c) => !pendingDelete[c.campaign.id]);
  const webhooks = dashboard.data?.webhooks ?? [];
  const totals = campaigns.reduce(
    (acc, c) => {
      for (const entry of c.entries) acc[entry.status] = (acc[entry.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-baseline gap-3">
            <span className="font-display text-lg text-foreground">CampaignHub</span>
            <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
              studio
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden font-mono text-[11px] text-muted-foreground sm:inline">
              queued {totals["queued"] ?? 0} · publishing {totals["publishing"] ?? 0} · published{" "}
              {totals["published"] ?? 0} · failed {totals["failed"] ?? 0}
            </span>
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={signOut}>
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        {/* Full width so the blog-library previews get a real three-up grid. */}
        <CampaignComposer
          library={library.data ?? []}
          libraryLoading={library.isLoading}
          busy={compose.isPending}
          onSubmit={async (input) => {
            await compose.mutateAsync(input);
          }}
        />

        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-border bg-surface p-5">

            <h2 className="font-display text-lg text-foreground">Operations</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Drive the durable worker and simulate platform rate limits.
            </p>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="schedule-at">Schedule time</Label>
                <Input
                  id="schedule-at"
                  type="datetime-local"
                  value={scheduleAt}
                  onChange={(e) => setScheduleAt(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => run("Worker tick complete", () => fns.tick({}))}
                >
                  Run worker tick
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    run("X will rate-limit the next 2 attempts", () =>
                      fns.rateLimit({ data: { platform: "x", failures: 2 } }),
                    )
                  }
                >
                  Force 429 on X
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    run("Instagram will rate-limit the next 2 attempts", () =>
                      fns.rateLimit({ data: { platform: "instagram", failures: 2 } }),
                    )
                  }
                >
                  Force 429 on Instagram
                </Button>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="font-display text-lg text-foreground">Delivery webhooks</h2>
            <p className="mb-3 text-sm text-muted-foreground">
              Signature-verified callbacks — the only writer of terminal status.
            </p>
            <ul className="space-y-2">
              {webhooks.length === 0 ? (
                <li className="text-xs text-muted-foreground">No webhook traffic yet.</li>
              ) : null}
              {webhooks.map((event) => (
                <li
                  key={event.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background/50 px-3 py-2 font-mono text-[11px]"
                >
                  <span className={event.signatureValid ? "text-status-published" : "text-status-failed"}>
                    {event.signatureValid ? "signed" : "rejected"} · {event.httpStatus}
                  </span>
                  <span className="truncate text-muted-foreground">{event.message ?? "—"}</span>
                  <span className="text-muted-foreground">
                    {new Date(event.receivedAt).toLocaleTimeString()}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="space-y-6">
          {campaigns.length === 0 ? (
            <section className="rounded-2xl border border-dashed border-border p-12 text-center">
              <h2 className="font-display text-xl text-foreground">No campaigns yet</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Paste a blog post or upload a document to generate your first set of
                platform-native variants.
              </p>
            </section>
          ) : null}

          {campaigns.map((snapshot) => (
            <section
              key={snapshot.campaign.id}
              className="rounded-2xl border border-border bg-surface"
            >
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
                <div className="min-w-0">
                  <h2 className="truncate font-display text-lg text-foreground">
                    {snapshot.campaign.name}
                  </h2>
                  <p className="truncate font-mono text-[11px] text-muted-foreground">
                    {snapshot.post.url ?? `source: ${snapshot.post.source}`} ·{" "}
                    {new Date(snapshot.campaign.createdAt).toLocaleString()}
                  </p>
                </div>
                <StatusChip status={snapshot.campaign.status} kind="campaign" />
              </header>

              <div className="flex flex-wrap gap-2 border-b border-border px-5 py-3">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() =>
                    run("Captions regenerated", () =>
                      fns.captions({ data: { campaignId: snapshot.campaign.id } }),
                    )
                  }
                >
                  Regenerate captions
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() =>
                    run("Image variants regenerated", () =>
                      fns.images({ data: { campaignId: snapshot.campaign.id } }),
                    )
                  }
                >
                  Regenerate images
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy}
                  onClick={() =>
                    run("Campaign scheduled", () =>
                      fns.schedule({
                        data: {
                          campaignId: snapshot.campaign.id,
                          scheduledFor: new Date(scheduleAt).toISOString(),
                        },
                      }),
                    )
                  }
                >
                  Schedule
                </Button>
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() =>
                    run("Publish attempted", () =>
                      fns.publish({ data: { campaignId: snapshot.campaign.id } }),
                    )
                  }
                >
                  Publish now
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    run("Retry queued", () =>
                      fns.retry({ data: { campaignId: snapshot.campaign.id } }),
                    )
                  }
                >
                  Retry failed
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => setEditingId(snapshot.campaign.id)}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  className="text-status-failed hover:text-status-failed"
                  onClick={() => requestDelete(snapshot.campaign.id, snapshot.campaign.name)}
                >
                  Delete
                </Button>
              </div>

              <CampaignEditDialog
                snapshot={snapshot}
                open={editingId === snapshot.campaign.id}
                busy={busy}
                onOpenChange={(open) => setEditingId(open ? snapshot.campaign.id : null)}
                onSave={saveEdit}
              />

              <div className="grid gap-4 p-5 md:grid-cols-2">
                {snapshot.entries.map((entry) => (
                  <VariantCard
                    key={entry.id}
                    entry={entry}
                    imageUrl={snapshot.images[entry.platform] ?? null}
                  />
                ))}
              </div>
            </section>
          ))}
          </div>
        </div>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-7xl px-6 py-6 font-mono text-[11px] text-muted-foreground">
          © CampaignHub
        </div>
      </footer>
    </div>
  );
}

