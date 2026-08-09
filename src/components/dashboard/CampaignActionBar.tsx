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
import { useDashboardI18n } from "@/i18n/dashboard/context";
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

export function CampaignActionBar({
  busy,
  scheduleAt,
  expanded,
  onScheduleAtChange,
  onPublish,
  onSchedule,
  onRegenerateCaptions,
  onRegenerateImages,
  onRetry,
  onEdit,
  onDelete,
  scheduleInputId = "library-schedule-at",
}: {
  busy: boolean;
  scheduleAt: string;
  expanded: boolean;
  onScheduleAtChange: (value: string) => void;
  onPublish: () => void;
  onSchedule: () => void;
  onRegenerateCaptions: () => void;
  onRegenerateImages: () => void;
  onRetry: () => void;
  onEdit: () => void;
  onDelete: () => void;
  scheduleInputId?: string;
}) {
  const { t } = useDashboardI18n();
  const a = t.actions;

  if (!expanded) return null;

  return (
    <div className="border-b border-border/60 bg-surface-raised/20">
      <div className="space-y-3 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={busy} onClick={onPublish} className="gap-1.5">
            <Send className="size-3.5" />
            {a.publishNow}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={onSchedule}
            className="gap-1.5"
          >
            <CalendarClock className="size-3.5" />
            {a.schedule}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" disabled={busy} className="gap-1.5">
                <MoreHorizontal className="size-3.5" />
                {a.more}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              <DropdownMenuItem onClick={onRegenerateCaptions} className="gap-2">
                <Sparkles className="size-3.5" />
                {a.regenerateCaptions}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onRegenerateImages} className="gap-2">
                <RefreshCw className="size-3.5" />
                {a.regenerateImages}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onRetry} className="gap-2">
                <RotateCcw className="size-3.5" />
                {a.retryFailed}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onEdit} className="gap-2">
                <Pencil className="size-3.5" />
                {a.editCampaign}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onDelete}
                className="gap-2 text-status-failed focus:text-status-failed"
              >
                <Trash2 className="size-3.5" />
                {a.delete}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="max-w-xs">
          <Label htmlFor={scheduleInputId} className="text-[11px] text-muted-foreground">
            {a.scheduleTime}
          </Label>
          <Input
            id={scheduleInputId}
            type="datetime-local"
            value={scheduleAt}
            onChange={(e) => onScheduleAtChange(e.target.value)}
            className="mt-1 h-8 text-xs"
          />
        </div>
      </div>
    </div>
  );
}
