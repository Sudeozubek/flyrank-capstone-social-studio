import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { CampaignComposer, type ComposerSubmit } from "@/components/campaign/CampaignComposer";
import { useDashboardI18n } from "@/i18n/dashboard/context";
import type { AiSpendSnapshot } from "@/domain/ai-spend";
import type { LibraryGroup } from "@/components/campaign/CampaignComposer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function CampaignComposerDialog({
  open,
  onOpenChange,
  library,
  libraryLoading,
  busy,
  aiSpend,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  library: LibraryGroup[];
  libraryLoading: boolean;
  busy: boolean;
  aiSpend?: AiSpendSnapshot | null;
  onSubmit: (input: ComposerSubmit) => Promise<void>;
}) {
  const { t } = useDashboardI18n();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = useState(true);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
    setAtBottom(remaining < 24);
  }, []);

  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      observer.disconnect();
    };
  }, [open, updateScrollState, libraryLoading]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "composer-modal-shell flex h-[min(92vh,880px)] max-h-[92vh] w-[calc(100%-1.5rem)] max-w-5xl flex-col gap-0 overflow-hidden",
          "border border-border/80 bg-surface p-0 shadow-2xl sm:rounded-2xl",
        )}
      >
        <DialogHeader className="shrink-0 border-b border-border/60 bg-surface-raised/30 px-5 py-4 text-left light:bg-surface-raised/50">
          <DialogTitle className="font-display text-xl text-foreground">{t.composer.title}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {t.composer.subtitle}
          </DialogDescription>
        </DialogHeader>

        <div className="relative min-h-0 flex-1">
          <div
            ref={scrollRef}
            className="composer-modal-body h-full overflow-y-auto overscroll-contain px-5 py-4 pb-10"
          >
            <CampaignComposer
              embedded
              library={library}
              libraryLoading={libraryLoading}
              busy={busy}
              aiSpend={aiSpend ?? null}
              onSubmit={async (input) => {
                await onSubmit(input);
                onOpenChange(false);
              }}
            />
          </div>

          <div
            className="composer-scroll-fade pointer-events-none absolute inset-x-0 bottom-0 flex h-16 flex-col items-center justify-end pb-2"
            data-hidden={atBottom ? "true" : "false"}
            aria-hidden
          >
            <span className="mb-1 flex items-center gap-1 rounded-full border border-border/70 bg-surface/95 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground shadow-sm backdrop-blur-sm">
              <ChevronDown className="size-3 animate-bounce" />
              {t.composer.scrollHint}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
