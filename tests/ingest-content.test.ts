import { describe, expect, it } from "vitest";
import { ingestPastedPost, ingestUploadedPost } from "@/application/ingest-content";
import { importLibraryPost } from "@/application/import-library-post";
import { createMockAppContext } from "./helpers/mock-app-context";

const LONG_BODY =
  "Publishing at scale is a reliability problem. Retries must not duplicate posts. Leases make a crashed worker safe. Idempotency keys collapse replays into one remote post.";

describe("ingestPastedPost", () => {
  it("rejects bodies shorter than 40 characters", async () => {
    const { context } = createMockAppContext();
    await expect(ingestPastedPost(context, { body: "too short" })).rejects.toThrow(
      /at least 40 characters/,
    );
  });

  it("creates a post with a derived title from the first line", async () => {
    const { context, state } = createMockAppContext();
    const post = await ingestPastedPost(context, {
      body: `# My Article Title\n\n${LONG_BODY}`,
      url: "https://example.com/post",
    });
    expect(post.title).toBe("My Article Title");
    expect(post.source).toBe("paste");
    expect(post.url).toBe("https://example.com/post");
    expect(state.posts).toHaveLength(1);
  });
});

describe("ingestUploadedPost", () => {
  it("delegates to the document parser", async () => {
    const { context } = createMockAppContext();
    const data = new TextEncoder().encode(`# Uploaded Doc\n\n${LONG_BODY}`);
    const post = await ingestUploadedPost(context, {
      kind: "markdown",
      filename: "article.md",
      data,
    });
    expect(post.source).toBe("markdown");
    expect(post.body.length).toBeGreaterThanOrEqual(40);
  });
});

describe("importLibraryPost", () => {
  it("rejects articles shorter than 200 characters", async () => {
    const { context } = createMockAppContext();
    await expect(
      importLibraryPost(context, {
        title: "Short",
        body: "x".repeat(100),
        url: "https://example.com/short",
      }),
    ).rejects.toThrow(/too short/);
  });

  it("deduplicates by URL", async () => {
    const { context } = createMockAppContext();
    const input = {
      title: "Published article",
      body: "x".repeat(220),
      url: "https://example.com/article",
    };
    const first = await importLibraryPost(context, input);
    const second = await importLibraryPost(context, input);
    expect(second.id).toBe(first.id);
  });

  it("creates a seed-sourced post for new URLs", async () => {
    const { context } = createMockAppContext();
    const post = await importLibraryPost(context, {
      title: "Cloudflare blog",
      body: "x".repeat(220),
      url: "https://blog.cloudflare.com/example",
    });
    expect(post.source).toBe("seed");
    expect(post.url).toBe("https://blog.cloudflare.com/example");
  });
});
