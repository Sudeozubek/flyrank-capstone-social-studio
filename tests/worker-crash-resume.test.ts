/**
 * Crash-mid-batch resume, in-process against the durable store.
 * Proves: a claimed row left behind by a dead worker is not double-claimed
 * while its lease is alive, is reclaimed after the lease expires, and keeps
 * the same idempotency key so the replay cannot double-post.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { claim, createCampaign, dueEntries, idempotencyKeyFor, LEASE_MS } from "@/lib/campaign.server";
import { db, mutate, resetStore } from "@/lib/store.server";

describe("durable worker claims", () => {
  beforeEach(() => resetStore());

  it("creates one entry per platform and no duplicates on re-run", () => {
    createCampaign({ postId: "post_pipeline" });
    createCampaign({ postId: "post_pipeline" });
    const entries = db().entries.filter((e) => e.postId === "post_pipeline");
    expect(entries).toHaveLength(2);
    expect(new Set(entries.map((e) => e.idempotencyKey)).size).toBe(2);
    expect(entries.map((e) => e.idempotencyKey)).toContain(idempotencyKeyFor("post_pipeline", "x"));
  });

  it("does not hand the same row to a second worker while the lease is alive", () => {
    createCampaign({ postId: "post_pipeline" });
    const target = db().entries[0]!;
    const first = claim(target.id);
    expect(first?.status).toBe("publishing");
    expect(claim(target.id)).toBeUndefined();
  });

  it("resumes a crashed batch after the lease expires, without changing the idempotency key", () => {
    createCampaign({ postId: "post_pipeline" });
    const target = db().entries[0]!;
    const claimed = claim(target.id)!;

    // Worker process dies here: the row stays `publishing` with a live lease.
    expect(dueEntries()).not.toContainEqual(expect.objectContaining({ id: target.id }));

    // Time passes past the lease (dev clock stands in for a restart delay).
    mutate((s) => {
      s.clockOffsetMs = LEASE_MS + 1000;
    });

    expect(dueEntries().map((e) => e.id)).toContain(target.id);
    const reclaimed = claim(target.id)!;
    expect(reclaimed.attempts).toBe(claimed.attempts + 1);
    expect(reclaimed.idempotencyKey).toBe(claimed.idempotencyKey);
  });

  it("never re-claims a published row", () => {
    createCampaign({ postId: "post_pipeline" });
    const target = db().entries[0]!;
    mutate((s) => {
      s.entries.find((e) => e.id === target.id)!.status = "published";
    });
    expect(claim(target.id)).toBeUndefined();
    expect(dueEntries().map((e) => e.id)).not.toContain(target.id);
  });

  it("only picks up scheduled rows once they are due", () => {
    const future = new Date(Date.now() + 30 * 60_000).toISOString();
    createCampaign({ postId: "post_variants", scheduledFor: future });
    expect(dueEntries()).toHaveLength(0);
    mutate((s) => {
      s.clockOffsetMs = 31 * 60_000;
    });
    expect(dueEntries()).toHaveLength(2);
  });
});
