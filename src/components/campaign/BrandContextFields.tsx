import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { BRAND_TONE_OPTIONS, resolveBrandTone } from "@/config/brand-tones.config";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

const DEFAULT_TONE = "__default__";

export function BrandContextFields({
  brandName,
  brandTone,
  onBrandNameChange,
  onBrandToneChange,
  nameInputId = "brand-name",
  toneSelectId = "brand-tone",
  className,
}: {
  brandName: string;
  brandTone: string;
  onBrandNameChange: (value: string) => void;
  onBrandToneChange: (value: string) => void;
  nameInputId?: string;
  toneSelectId?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(Boolean(brandName.trim() || brandTone));
  const selectedTone = brandTone ? resolveBrandTone(brandTone) : null;

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className={cn("rounded-xl border border-border bg-background/50", className)}
    >
      <CollapsibleTrigger className="flex w-full items-start justify-between gap-3 p-4 text-left">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Brand context (optional)
          </p>
          <p className="text-xs text-muted-foreground">
            {selectedTone
              ? `Captions will use a ${selectedTone.label.toLowerCase()} tone.`
              : "Expand to set a brand name and tone of voice for generated captions."}
          </p>
        </div>
        <ChevronDown
          className={cn(
            "mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </CollapsibleTrigger>

      <CollapsibleContent className="px-4 pb-4">
        <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
          <div className="space-y-2 min-w-0">
            <Label htmlFor={nameInputId}>Brand / company name</Label>
            <Input
              id={nameInputId}
              value={brandName}
              onChange={(e) => onBrandNameChange(e.target.value)}
              placeholder="Acme Inc."
            />
          </div>
          <div className="space-y-2 min-w-0">
            <Label htmlFor={toneSelectId}>Brand tone</Label>
            <Select
              value={brandTone || DEFAULT_TONE}
              onValueChange={(value) => onBrandToneChange(value === DEFAULT_TONE ? "" : value)}
            >
              <SelectTrigger id={toneSelectId}>
                <SelectValue placeholder="Default voice" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DEFAULT_TONE}>Default voice</SelectItem>
                {BRAND_TONE_OPTIONS.map((tone) => (
                  <SelectItem key={tone.id} value={tone.id}>
                    {tone.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTone && (
              <p className="text-[11px] text-muted-foreground">{selectedTone.description}</p>
            )}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
