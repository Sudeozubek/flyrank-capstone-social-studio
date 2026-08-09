/**
 * DocumentParser adapter. Server-side extraction for the three accepted
 * upload formats; mature libraries only (mammoth for DOCX, unpdf for PDF).
 * Output is normalised to the canonical { title, body } shape.
 */

import type { DocumentParser, ParsedDocument } from "@/domain/ports";

function cleanup(text: string): string {
  return (
    text
      .replace(/\r\n/g, "\n")
      // eslint-disable-next-line no-control-regex -- NUL bytes are real in PDF/DOCX extraction
      .replace(/\u{0000}/gu, "")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

function titleFromFilename(filename: string): string {
  return (
    filename
      .replace(/\.[^.]+$/, "")
      .replace(/[-_]+/g, " ")
      .trim() || "Untitled post"
  );
}

/** Strip Markdown syntax down to prose and lift the first heading as the title. */
export function parseMarkdown(raw: string, filename = "post.md"): ParsedDocument {
  const text = cleanup(raw);
  const headingMatch = text.match(/^#\s+(.+)$/m);
  const title =
    headingMatch?.[1]?.trim() || text.split("\n")[0]?.slice(0, 120) || titleFromFilename(filename);

  const body = cleanup(
    text
      .replace(/^#\s+.+$/m, "")
      .replace(/^```[\s\S]*?```$/gm, "")
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/[*_`>]/g, "")
      .replace(/^\s*[-+*]\s+/gm, ""),
  );

  return { title: title.slice(0, 200), body };
}

export const documentParser: DocumentParser = {
  async parse(kind, data, filename): Promise<ParsedDocument> {
    if (kind === "markdown") {
      return parseMarkdown(new TextDecoder().decode(data), filename);
    }

    if (kind === "docx") {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({
        buffer: Buffer.from(data.buffer as ArrayBuffer, data.byteOffset, data.byteLength),
      });
      const text = cleanup(result.value);
      const [first = "", ...rest] = text.split("\n");
      return {
        title: (first.trim() || titleFromFilename(filename)).slice(0, 200),
        body: cleanup(rest.join("\n")) || text,
      };
    }

    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(data));
    const { text } = await extractText(pdf, { mergePages: true });
    const merged = cleanup(Array.isArray(text) ? text.join("\n") : text);
    const [first = "", ...rest] = merged.split("\n");
    return {
      title: (first.trim() || titleFromFilename(filename)).slice(0, 200),
      body: cleanup(rest.join("\n")) || merged,
    };
  },
};

export function kindFromFilename(filename: string): "markdown" | "pdf" | "docx" | null {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".md") || lower.endsWith(".markdown") || lower.endsWith(".txt"))
    return "markdown";
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".docx")) return "docx";
  return null;
}
