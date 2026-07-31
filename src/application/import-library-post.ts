/**
 * Use case: turn a catalogued *published* blog post into a BlogPost row.
 * The article text is fetched by the caller (infrastructure) so this stays pure.
 */

import type { BlogPost } from "@/domain/entities";
import type { AppContext } from "@/domain/ports";

export interface ImportLibraryInput {
  title: string;
  body: string;
  url: string;
}

export async function importLibraryPost(
  context: AppContext,
  input: ImportLibraryInput,
): Promise<BlogPost> {
  const body = input.body.trim();
  if (body.length < 200) throw new Error("The published article body is too short to campaign on");

  const existing = (await context.posts.list()).find((post) => post.url === input.url);
  if (existing) return existing;

  return context.posts.create({
    title: input.title.trim().slice(0, 200) || "Untitled post",
    body,
    url: input.url,
    source: "seed",
  });
}
