import { describe, expect, it } from "vitest";
import {
  assertPublicHttpUrl,
  parseArticleFromHtml,
} from "@/infrastructure/feeds/blog-library.server";

describe("assertPublicHttpUrl", () => {
  it("accepts public https URLs", () => {
    const url = assertPublicHttpUrl("https://blog.example.com/post");
    expect(url.hostname).toBe("blog.example.com");
  });

  it("rejects localhost", () => {
    expect(() => assertPublicHttpUrl("http://localhost/post")).toThrow(/cannot be fetched/);
  });

  it("rejects private networks", () => {
    expect(() => assertPublicHttpUrl("http://192.168.1.10/post")).toThrow(/cannot be fetched/);
  });

  it("rejects invalid URLs", () => {
    expect(() => assertPublicHttpUrl("not-a-url")).toThrow(/valid http/);
  });
});

describe("parseArticleFromHtml", () => {
  it("extracts title and body from article markup", () => {
    const html = `<!doctype html><html><head>
      <meta property="og:title" content="Launch Week" />
      </head><body><article><h1>Ignored</h1><p>${"Word ".repeat(80)}</p></article></body></html>`;
    const parsed = parseArticleFromHtml(html);
    expect(parsed.title).toBe("Launch Week");
    expect(parsed.body.length).toBeGreaterThan(200);
  });
});
