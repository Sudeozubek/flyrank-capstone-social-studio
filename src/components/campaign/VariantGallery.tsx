import { useCallback, useEffect, useMemo, useState } from "react";
import { PLATFORM_SPECS } from "@/config/platform-specs";
import { PLATFORMS, type SocialPostEntry } from "@/domain/entities";
import { VariantCard, VARIANT_CARD_HEIGHT } from "@/components/campaign/VariantCard";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

export interface VariantGalleryProps {
  entries: SocialPostEntry[];
  images: Record<string, string | null>;
  className?: string;
}

function sortByPlatformOrder(entries: SocialPostEntry[]): SocialPostEntry[] {
  return [...entries].sort(
    (a, b) => PLATFORMS.indexOf(a.platform) - PLATFORMS.indexOf(b.platform),
  );
}

const arrowClass =
  "top-1/2 z-20 h-9 w-9 -translate-y-1/2 rounded-full border-2 border-primary/40 bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 disabled:border-border disabled:bg-muted disabled:text-muted-foreground disabled:opacity-40";

export function VariantGallery({ entries, images, className }: VariantGalleryProps) {
  const sorted = useMemo(() => sortByPlatformOrder(entries), [entries]);
  const [api, setApi] = useState<CarouselApi>();
  const [active, setActive] = useState(0);

  const onSelect = useCallback(() => {
    if (!api) return;
    setActive(api.selectedScrollSnap());
  }, [api]);

  useEffect(() => {
    if (!api) return;
    onSelect();
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api, onSelect]);

  if (sorted.length === 0) {
    return (
      <div className={cn("rounded-lg border border-dashed border-border p-6 text-center", className)}>
        <p className="text-xs text-muted-foreground">No platform variants yet.</p>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Swipe or use arrows →
        </p>
        <div className="flex items-center gap-1" role="tablist" aria-label="Platform slides">
          {sorted.map((entry, index) => {
            const label = PLATFORM_SPECS[entry.platform].label;
            const isActive = index === active;
            return (
              <button
                key={entry.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={`Show ${label}`}
                onClick={() => api?.scrollTo(index)}
                className={cn(
                  "rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className={cn("relative px-11", VARIANT_CARD_HEIGHT)}>
        <Carousel
          setApi={setApi}
          opts={{
            align: "start",
            loop: false,
            dragFree: false,
            containScroll: "trimSnaps",
          }}
          className="h-full w-full"
        >
          <CarouselContent className="ml-0 h-full">
            {sorted.map((entry, index) => (
              <CarouselItem key={entry.id} className={cn("basis-full pl-0", VARIANT_CARD_HEIGHT)}>
                <VariantCard
                  entry={entry}
                  imageUrl={images[entry.platform] ?? null}
                  slideIndex={index}
                  slideCount={sorted.length}
                  layout="wide"
                />
              </CarouselItem>
            ))}
          </CarouselContent>

          <CarouselPrevious size="icon" className={cn("left-0", arrowClass)} />
          <CarouselNext size="icon" className={cn("right-0", arrowClass)} />
        </Carousel>
      </div>
    </div>
  );
}
