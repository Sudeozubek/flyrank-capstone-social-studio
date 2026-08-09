import { Skeleton } from "@/components/ui/skeleton";

export function CampaignListSkeleton() {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <div className="border-b border-border bg-surface-raised/30 px-5 py-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-2 h-4 w-56" />
      </div>
      <div className="divide-y divide-border/50">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4">
            <Skeleton className="size-14 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-64" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-8 rounded-md" />
                <Skeleton className="h-5 w-8 rounded-md" />
                <Skeleton className="h-5 w-8 rounded-md" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
