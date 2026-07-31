import { ActionButton } from "./ActionButton";

interface Props {
  postId: string | null;
  busy: boolean;
  clockOffsetMs: number;
  force429: number;
  onAction: (body: Record<string, unknown>) => void;
}

export function DevPanel({ postId, busy, clockOffsetMs, force429, onAction }: Props) {
  const offsetMin = Math.round(clockOffsetMs / 60000);

  return (
    <section className="panel p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="eyebrow">Dev control panel</h2>
        <span className="font-mono text-[11px] text-muted-foreground">
          clock +{offsetMin}m · 429 armed: {force429}
        </span>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Sandbox controls. Every call hits the in-repo fake platform — no real account is touched.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <ActionButton disabled={busy} onClick={() => onAction({ action: "force429", count: 2 })}>
          Force 429 ×2
        </ActionButton>
        <ActionButton disabled={busy} onClick={() => onAction({ action: "advanceClock", minutes: 10 })}>
          Advance clock +10m
        </ActionButton>
        <ActionButton disabled={busy} onClick={() => onAction({ action: "resetClock" })}>
          Reset clock
        </ActionButton>
        <ActionButton disabled={busy} onClick={() => onAction({ action: "tick" })}>
          Run worker tick
        </ActionButton>
        <ActionButton
          variant="danger"
          disabled={busy || !postId}
          onClick={() => onAction({ action: "sendWebhook", postId, forged: true })}
        >
          Fire forged webhook
        </ActionButton>
        <ActionButton
          disabled={busy || !postId}
          onClick={() => onAction({ action: "sendWebhook", postId, forged: false })}
        >
          Fire valid webhook
        </ActionButton>
        <ActionButton variant="danger" disabled={busy} onClick={() => onAction({ action: "reset" })}>
          Reset all state
        </ActionButton>
      </div>
    </section>
  );
}
