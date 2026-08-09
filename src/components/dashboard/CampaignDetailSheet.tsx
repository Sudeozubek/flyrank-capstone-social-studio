import {
  CalendarClock,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  RotateCcw,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";
import type { DashboardCampaignSnapshot } from "@/components/dashboard/types";
import { CampaignEditDialog, type CampaignEdit } from "@/components/campaign/CampaignEditDialog";
import { StatusChip } from "@/components/campaign/StatusChip";
import { VariantGallery } from "@/components/campaign/VariantGallery";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export function CampaignDetailSheet({
  snapshot,
  open,
  busy,
  scheduleAt,
  editing,
  onScheduleAtChange,
  onOpenChange,
  onEditOpen,
  onEditClose,
  onSaveEdit,
  onPublish,
  onSchedule,
  onRegenerateCaptions,
  onRegenerateImages,
  onRetry,
  onDelete,
}: {
  snapshot: DashboardCampaignSnapshot | null;
  open: boolean;
  busy: boolean;
  scheduleAt: string;
  editing: boolean;
  onScheduleAtChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  onEditOpen: () => void;
  onEditClose: () => void;
  onSaveEdit: (edit: CampaignEdit) => Promise<void>;
  onPublish: () => void;
  onSchedule: () => void;
  onRegenerateCaptions: () => void;
  onRegenerateImages: () => void;
  onRetry: () => void;
  onDelete: () => void;
}) {
  if (!snapshot) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 border-border/60 bg-background/95 p-0 backdrop-blur-xl light:bg-surface sm:max-w-3xl"
        >
          <SheetHeader className="space-y-1 border-b border-border/50 px-5 py-4 text-left">
            <div className="flex items-start justify-between gap-3 pr-8">
              <div className="min-w-0">
                <SheetTitle className="truncate font-display text-lg">
                  {snapshot.campaign.name}
                </SheetTitle>
                <SheetDescription className="truncate text-xs">
                  {snapshot.post.url ?? `Source: ${snapshot.post.source}`} ·{" "}
                  {new Date(snapshot.campaign.createdAt).toLocaleString()}
                </SheetDescription>
              </div>
              <StatusChip status={snapshot.campaign.status} kind="campaign" />
            </div>
          </SheetHeader>

          <div className="border-b border-border/50 px-5 py-3">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex min-w-0 flex-1 flex-wrap gap-2">
                <Button size="sm" disabled={busy} onClick={onPublish} className="gap-1.5">
                  <Send className="size-3.5" />
                  Publish now
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy}
                  onClick={onSchedule}
                  className="gap-1.5"
                >
                  <CalendarClock className="size-3.5" />
                  Schedule
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline" disabled={busy} className="gap-1.5">
                      <MoreHorizontal className="size-3.5" />
                      More
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-52">
                    <DropdownMenuItem onClick={onRegenerateCaptions} className="gap-2">
                      <Sparkles className="size-3.5" />
                      Regenerate captions
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onRegenerateImages} className="gap-2">
                      <RefreshCw className="size-3.5" />
                      Regenerate images
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onRetry} className="gap-2">
                      <RotateCcw className="size-3.5" />
                      Retry failed
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onEditOpen} className="gap-2">
                      <Pencil className="size-3.5" />
                      Edit campaign
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={onDelete}
                      className="gap-2 text-status-failed focus:text-status-failed"
                    >
                      <Trash2 className="size-3.5" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="w-full min-w-[12rem] flex-1 sm:max-w-[14rem]">
                <Label htmlFor="detail-schedule-at" className="text-[11px] text-muted-foreground">
                  Schedule time
                </Label>
                <Input
                  id="detail-schedule-at"
                  type="datetime-local"
                  value={scheduleAt}
                  onChange={(e) => onScheduleAtChange(e.target.value)}
                  className="mt-1 h-8 text-xs"
                />
              </div>
            </div>
          </div>

          <ScrollArea className="flex-1 px-3 py-4">
            <VariantGallery entries={snapshot.entries} images={snapshot.images} />
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <CampaignEditDialog
        snapshot={snapshot}
        open={editing}
        busy={busy}
        onOpenChange={(next) => (next ? onEditOpen() : onEditClose())}
        onSave={onSaveEdit}
      />
    </>
  );
}
