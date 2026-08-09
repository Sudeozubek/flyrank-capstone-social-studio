import { ArrowRight, PartyPopper } from "lucide-react";
import { interpolate } from "@/i18n/dashboard/catalog";
import { useDashboardI18n } from "@/i18n/dashboard/context";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function CampaignReadyDialog({
  open,
  campaignName,
  onOpenChange,
  onOpenCampaign,
}: {
  open: boolean;
  campaignName: string;
  onOpenChange: (open: boolean) => void;
  onOpenCampaign: () => void;
}) {
  const { t } = useDashboardI18n();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="composer-modal-shell max-w-md border border-border/80 bg-surface sm:rounded-2xl">
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-status-published/15 text-status-published">
            <PartyPopper className="size-6" />
          </div>
          <DialogTitle className="font-display text-xl">{t.ready.title}</DialogTitle>
          <DialogDescription className="text-sm">
            {interpolate(t.ready.body, { name: campaignName })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button className="w-full gap-2" onClick={onOpenCampaign}>
            {t.ready.open}
            <ArrowRight className="size-4" />
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
            {t.ready.stay}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
