import { createFileRoute, useNavigate, useRouteContext } from "@tanstack/react-router";
import { DEFAULT_CAMPAIGN_LANGUAGE } from "@/config/campaign-languages.config";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import type { ComposerSubmit } from "@/components/campaign/CampaignComposer";
import type { CampaignEdit } from "@/components/campaign/CampaignEditDialog";
import { ActivityView } from "@/components/dashboard/ActivityView";
import { CampaignComposerDialog } from "@/components/dashboard/CampaignComposerDialog";
import { CampaignLibraryView } from "@/components/dashboard/CampaignLibraryView";
import { CampaignReadyDialog } from "@/components/dashboard/CampaignReadyDialog";
import { CampaignsStartView } from "@/components/dashboard/CampaignsStartView";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import type { DashboardView } from "@/components/dashboard/types";
import { interpolate } from "@/i18n/dashboard/catalog";
import { DashboardI18nProvider, useDashboardI18n } from "@/i18n/dashboard/context";
import { PLATFORM_SPECS } from "@/config/platform-specs";
import { supabase } from "@/integrations/supabase/client";
import {
  createCampaignWithAssets,
  createCampaignFromLibrary,
  createCampaignFromUrl,
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

function Dashboard() {
  return (
    <DashboardI18nProvider>
      <DashboardPage />
    </DashboardI18nProvider>
  );
}

function localIsoInMinutes(minutes: number): string {
  const d = new Date(Date.now() + minutes * 60_000 - new Date().getTimezoneOffset() * 60_000);
  return d.toISOString().slice(0, 16);
}

function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useRouteContext({ from: "/_authenticated" });
  const { t } = useDashboardI18n();
  const queryClient = useQueryClient();
  const load = useServerFn(loadDashboard);
  const [view, setView] = useState<DashboardView>("campaigns");
  const [composerOpen, setComposerOpen] = useState(false);
  const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null);
  const [readyCampaign, setReadyCampaign] = useState<{ id: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [scheduleAt, setScheduleAt] = useState(localIsoInMinutes(2));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Record<string, ReturnType<typeof setTimeout>>>(
    {},
  );

  const dashboard = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => load(),
    refetchInterval: view === "activity" ? 4000 : view === "library" ? false : 20000,
  });

  const fns = {
    createText: useServerFn(createPostFromText),
    fromLibrary: useServerFn(createCampaignFromLibrary),
    fromUrl: useServerFn(createCampaignFromUrl),
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
      toast.error(
        error instanceof Error
          ? error.message
          : interpolate(t.toasts.actionFailed, { action: label }),
      );
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
      if (input.mode === "url") {
        return fns.fromUrl({
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
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : t.toasts.createFailed),
  });

  function requestDelete(campaignId: string, name: string) {
    const timer = setTimeout(() => {
      setPendingDelete(({ [campaignId]: _removed, ...rest }) => rest);
      void run(t.toasts.campaignDeleted, () => fns.remove({ data: { campaignId } }));
      if (expandedCampaignId === campaignId) setExpandedCampaignId(null);
    }, 10_000);

    setPendingDelete((current) => ({ ...current, [campaignId]: timer }));

    toast(interpolate(t.toasts.deleteTitle, { name }), {
      description: t.toasts.deleteDescription,
      duration: 10_000,
      action: {
        label: t.toasts.undo,
        onClick: () => {
          clearTimeout(timer);
          setPendingDelete(({ [campaignId]: _removed, ...rest }) => rest);
        },
      },
    });
  }

  async function saveEdit(edit: CampaignEdit) {
    const done = await run(t.toasts.campaignUpdated, () =>
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
  const aiSpend = dashboard.data?.aiSpend;

  return (
    <DashboardLayout
      view={view}
      onViewChange={setView}
      aiSpend={aiSpend}
      live={dashboard.isSuccess}
      user={user}
      onNewCampaign={() => setComposerOpen(true)}
      onSignOut={signOut}
    >
      {view === "campaigns" ? (
        <CampaignsStartView
          campaignCount={campaigns.length}
          onCreate={() => setComposerOpen(true)}
          onOpenLibrary={() => setView("library")}
        />
      ) : view === "library" ? (
        <CampaignLibraryView
          campaigns={campaigns}
          expandedCampaignId={expandedCampaignId}
          onExpandCampaign={setExpandedCampaignId}
          scheduleAt={scheduleAt}
          onScheduleAtChange={setScheduleAt}
          busy={busy}
          editingId={editingId}
          onEditOpen={setEditingId}
          onEditClose={() => setEditingId(null)}
          onSaveEdit={saveEdit}
          onPublish={(campaignId) =>
            run(t.toasts.publishAttempted, () => fns.publish({ data: { campaignId } }))
          }
          onSchedule={(campaignId) =>
            run(t.toasts.campaignScheduled, () =>
              fns.schedule({
                data: {
                  campaignId,
                  scheduledFor: new Date(scheduleAt).toISOString(),
                },
              }),
            )
          }
          onRegenerateCaptions={(campaignId) =>
            run(t.toasts.captionsRegenerated, () => fns.captions({ data: { campaignId } }))
          }
          onRegenerateImages={(campaignId) =>
            run(t.toasts.imagesRegenerated, () => fns.images({ data: { campaignId } }))
          }
          onRetry={(campaignId) =>
            run(t.toasts.retryQueued, () => fns.retry({ data: { campaignId } }))
          }
          onDelete={requestDelete}
          onCreate={() => setComposerOpen(true)}
          loading={dashboard.isLoading}
        />
      ) : (
        <ActivityView
          aiSpend={aiSpend}
          webhooks={webhooks}
          busy={busy}
          scheduleAt={scheduleAt}
          onScheduleAtChange={setScheduleAt}
          onTick={() => run(t.toasts.workerTick, () => fns.tick({}))}
          onRateLimit={(platform) =>
            run(interpolate(t.toasts.rateLimit, { platform: PLATFORM_SPECS[platform].label }), () =>
              fns.rateLimit({ data: { platform, failures: 2 } }),
            )
          }
        />
      )}

      <CampaignComposerDialog
        open={composerOpen}
        onOpenChange={setComposerOpen}
        library={library.data ?? []}
        libraryLoading={library.isLoading}
        busy={compose.isPending}
        aiSpend={aiSpend ?? null}
        onSubmit={async (input) => {
          const snapshot = await compose.mutateAsync(input);
          setComposerOpen(false);
          if (snapshot?.campaign?.id) {
            setReadyCampaign({
              id: snapshot.campaign.id,
              name: snapshot.campaign.name,
            });
          }
        }}
      />

      <CampaignReadyDialog
        open={readyCampaign !== null}
        campaignName={readyCampaign?.name ?? t.ready.fallbackName}
        onOpenChange={(open) => {
          if (!open) setReadyCampaign(null);
        }}
        onOpenCampaign={() => {
          if (!readyCampaign) return;
          setView("library");
          setExpandedCampaignId(readyCampaign.id);
          setReadyCampaign(null);
        }}
      />
    </DashboardLayout>
  );
}
