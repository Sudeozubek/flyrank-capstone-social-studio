import { useEffect, useState } from "react";
import { PLATFORM_SPECS } from "@/config/platform-specs";
import type { CampaignSnapshot } from "@/domain/entities";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface CampaignEdit {
  campaignId: string;
  name: string;
  brandName: string;
  brandTone: string;
  captions: Array<{ entryId: string; caption: string }>;
}

/** Manual override surface: campaign name, brand context and per-platform captions. */
export function CampaignEditDialog({
  snapshot,
  open,
  busy,
  onOpenChange,
  onSave,
}: {
  snapshot: CampaignSnapshot;
  open: boolean;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (edit: CampaignEdit) => Promise<void> | void;
}) {
  const [name, setName] = useState(snapshot.campaign.name);
  const [brandName, setBrandName] = useState(snapshot.campaign.brandName ?? "");
  const [brandTone, setBrandTone] = useState(snapshot.campaign.brandTone ?? "");
  const [captions, setCaptions] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setName(snapshot.campaign.name);
    setBrandName(snapshot.campaign.brandName ?? "");
    setBrandTone(snapshot.campaign.brandTone ?? "");
    setCaptions(Object.fromEntries(snapshot.entries.map((e) => [e.id, e.caption])));
  }, [open, snapshot]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit campaign</DialogTitle>
          <DialogDescription>
            Rename the campaign, adjust the brand context and hand-write any caption.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Campaign name</Label>
            <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-brand-name">Brand / company name</Label>
              <Input
                id="edit-brand-name"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="Acme Inc."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-brand-tone">Brand tone</Label>
              <Input
                id="edit-brand-tone"
                value={brandTone}
                onChange={(e) => setBrandTone(e.target.value)}
                placeholder="Professional and confident"
              />
            </div>
          </div>

          {snapshot.entries.map((entry) => (
            <div key={entry.id} className="space-y-2">
              <Label htmlFor={`edit-caption-${entry.id}`}>
                {PLATFORM_SPECS[entry.platform]?.label ?? entry.platform} caption
              </Label>
              <Textarea
                id={`edit-caption-${entry.id}`}
                rows={entry.platform === "x" ? 4 : 8}
                value={captions[entry.id] ?? ""}
                onChange={(e) =>
                  setCaptions((current) => ({ ...current, [entry.id]: e.target.value }))
                }
                className="font-mono text-xs leading-relaxed"
              />
              <p className="text-[11px] text-muted-foreground">
                {(captions[entry.id] ?? "").length} /{" "}
                {PLATFORM_SPECS[entry.platform]?.maxCaptionLength ?? 0} characters
              </p>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            disabled={busy}
            onClick={() =>
              onSave({
                campaignId: snapshot.campaign.id,
                name,
                brandName,
                brandTone,
                captions: snapshot.entries.map((entry) => ({
                  entryId: entry.id,
                  caption: captions[entry.id] ?? entry.caption,
                })),
              })
            }
          >
            {busy ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
