/**
 * Use case: ingest content into a blog post.
 * Satisfies "given a published blog post (title + body + URL)" for pasted
 * text and for uploaded Markdown / PDF / DOCX documents.
 */

import type { BlogPost, PostSource } from "@/domain/entities";
import type { AppContext } from "@/domain/ports";

export interface IngestPastedInput {
  title?: string;
  body: string;
  url?: string | null;
}

export interface IngestUploadInput {
  kind: "markdown" | "pdf" | "docx";
  filename: string;
  data: Uint8Array;
  url?: string | null;
  title?: string;
}

function firstLineTitle(body: string): string {
  const line = body.split("\n").find((l) => l.trim().length > 0) ?? "Untitled post";
  return line
    .replace(/^#+\s*/, "")
    .trim()
    .slice(0, 200);
}

export async function ingestPastedPost(
  context: AppContext,
  input: IngestPastedInput,
): Promise<BlogPost> {
  const body = input.body.trim();
  if (body.length < 40) throw new Error("Blog body must be at least 40 characters");
  return context.posts.create({
    title: (input.title?.trim() || firstLineTitle(body)).slice(0, 200),
    body,
    url: input.url?.trim() || null,
    source: "paste" satisfies PostSource,
  });
}

export async function ingestUploadedPost(
  context: AppContext,
  input: IngestUploadInput,
): Promise<BlogPost> {
  const parsed = await context.parser.parse(input.kind, input.data, input.filename);
  const body = parsed.body.trim();
  if (body.length < 40) throw new Error("Could not extract enough text from the document");
  return context.posts.create({
    title: (input.title?.trim() || parsed.title).slice(0, 200),
    body,
    url: input.url?.trim() || null,
    source: input.kind,
  });
}
