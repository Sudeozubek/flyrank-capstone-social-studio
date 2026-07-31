import type { PostStatus } from "@/lib/types";

const MAP: Record<PostStatus, { label: string; className: string }> = {
  queued: { label: "Queued", className: "text-status-queued border-status-queued/40 bg-status-queued/10" },
  publishing: {
    label: "Publishing",
    className: "text-status-publishing border-status-publishing/40 bg-status-publishing/10",
  },
  published: {
    label: "Published",
    className: "text-status-published border-status-published/40 bg-status-published/10",
  },
  failed: { label: "Failed", className: "text-status-failed border-status-failed/40 bg-status-failed/10" },
};

export function StatusChip({ status }: { status: PostStatus }) {
  const { label, className } = MAP[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}
