import { describe, expect, it } from "vitest";
import {
  kindFromFilename,
  parseMarkdown,
} from "@/infrastructure/parsing/document-parser.server";

describe("kindFromFilename", () => {
  it("maps known extensions", () => {
    expect(kindFromFilename("post.md")).toBe("markdown");
    expect(kindFromFilename("post.markdown")).toBe("markdown");
    expect(kindFromFilename("notes.txt")).toBe("markdown");
    expect(kindFromFilename("report.pdf")).toBe("pdf");
    expect(kindFromFilename("brief.docx")).toBe("docx");
  });

  it("returns null for unsupported extensions", () => {
    expect(kindFromFilename("image.png")).toBeNull();
    expect(kindFromFilename("archive.zip")).toBeNull();
  });
});

describe("parseMarkdown", () => {
  it("extracts the first heading as title", () => {
    const raw = `# Campaign Strategy\n\nBody text goes here with enough content.`;
    const parsed = parseMarkdown(raw, "fallback.md");
    expect(parsed.title).toBe("Campaign Strategy");
    expect(parsed.body).toContain("Body text");
    expect(parsed.body).not.toContain("# Campaign");
  });

  it("strips markdown links and bold syntax", () => {
    const raw = `Title line\n\nRead [more](https://example.com) about **bold** ideas here today.`;
    const parsed = parseMarkdown(raw);
    expect(parsed.body).toContain("Read more about bold ideas");
    expect(parsed.body).not.toContain("](https://");
    expect(parsed.body).not.toContain("**");
  });

  it("uses the first line as title when no heading exists", () => {
    const parsed = parseMarkdown("Plain text without a heading.", "my-great-post.md");
    expect(parsed.title).toBe("Plain text without a heading.");
  });

  it("falls back to filename for empty content", () => {
    const parsed = parseMarkdown("", "my-great-post.md");
    expect(parsed.title).toBe("my great post");
  });
});
