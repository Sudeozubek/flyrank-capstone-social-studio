/**
 * Infrastructure: published-blog library.
 *
 * The capstone requires campaigns to start from a *published* post
 * (title + body + URL). Instead of asking the user to paste a URL, we keep a
 * small catalogue of public engineering/AI blogs, pull their latest published
 * posts in the background (RSS where available, listing scrape otherwise) and
 * let the user pick one. Nothing is generated — every item is a real,
 * already-published article with its canonical URL.
 */

const UA = "Mozilla/5.0 (compatible; FlyRankBot/1.0)";
const LIST_TTL_MS = 15 * 60 * 1000;
const ARTICLE_TTL_MS = 60 * 60 * 1000;

export interface BlogSource {
  id: string;
  name: string;
  homepage: string;
  kind: "rss" | "anthropic";
  feed: string;
}

export const BLOG_SOURCES: BlogSource[] = [
  {
    id: "anthropic",
    name: "Anthropic (Claude) News",
    homepage: "https://www.anthropic.com/news",
    kind: "anthropic",
    feed: "https://www.anthropic.com/news",
  },
  {
    id: "openai",
    name: "OpenAI News",
    homepage: "https://openai.com/news",
    kind: "rss",
    feed: "https://openai.com/blog/rss.xml",
  },
  {
    id: "cloudflare",
    name: "Cloudflare Blog",
    homepage: "https://blog.cloudflare.com",
    kind: "rss",
    feed: "https://blog.cloudflare.com/rss/",
  },
];

export interface LibraryItem {
  sourceId: string;
  sourceName: string;
  title: string;
  url: string;
  summary: string;
  /** Preview artwork advertised by the feed (media/enclosure/inline img), when present. */
  image: string | null;
  publishedAt: string | null;
}

interface CacheEntry<T> {
  value: T;
  expires: number;
}

const listCache = new Map<string, CacheEntry<LibraryItem[]>>();
const articleCache = new Map<string, CacheEntry<{ title: string; body: string }>>();

async function get(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml,application/xml" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`Blog source responded ${response.status}`);
  return response.text();
}

function decode(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;|&#x27;/gi, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .trim();
}

function stripHtml(html: string): string {
  const withoutBlocks = html
    .replace(/<(script|style|noscript|svg|nav|footer|header|form)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/(p|div|section|article|li|h[1-6]|br)>/gi, "\n");
  return decode(withoutBlocks.replace(/<[^>]+>/g, " "))
    .replace(/[ \t\u00a0]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function tag(block: string, name: string): string {
  const match = new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i").exec(block);
  return match?.[1] ? decode(match[1]) : "";
}

function parseRss(xml: string, source: BlogSource): LibraryItem[] {
  const blocks = xml.match(/<(item|entry)[\s\S]*?<\/\1>/gi) ?? [];
  return blocks
    .map((block) => {
      const link =
        tag(block, "link") ||
        /<link[^>]*href="([^"]+)"/i.exec(block)?.[1] ||
        tag(block, "guid");
      const summaryHtml = tag(block, "description") || tag(block, "summary") || "";
      const published = tag(block, "pubDate") || tag(block, "updated") || tag(block, "published");
      return {
        sourceId: source.id,
        sourceName: source.name,
        title: tag(block, "title"),
        url: decode(link ?? ""),
        summary: stripHtml(summaryHtml).slice(0, 320),
        publishedAt: published ? new Date(published).toISOString() : null,
      };
    })
    .filter((item) => item.title && /^https?:\/\//.test(item.url));
}

function parseAnthropicListing(html: string, source: BlogSource): LibraryItem[] {
  const slugs = [...html.matchAll(/href="\/news\/([a-z0-9][a-z0-9-]{4,})"/g)].map((m) => m[1]!);
  const unique = [...new Set(slugs)];
  return unique.map((slug) => ({
    sourceId: source.id,
    sourceName: source.name,
    title: slug
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" "),
    url: `https://www.anthropic.com/news/${slug}`,
    summary: "Published on Anthropic News.",
    publishedAt: null,
  }));
}

/** Latest published posts for one source (memoised for 15 minutes). */
export async function listSourcePosts(sourceId: string, limit = 12): Promise<LibraryItem[]> {
  const source = BLOG_SOURCES.find((entry) => entry.id === sourceId);
  if (!source) throw new Error(`Unknown blog source: ${sourceId}`);

  const cached = listCache.get(sourceId);
  if (cached && cached.expires > Date.now()) return cached.value.slice(0, limit);

  const raw = await get(source.feed);
  const items = (source.kind === "rss" ? parseRss(raw, source) : parseAnthropicListing(raw, source)).slice(
    0,
    24,
  );
  listCache.set(sourceId, { value: items, expires: Date.now() + LIST_TTL_MS });
  return items.slice(0, limit);
}

/** Every catalogued source, fetched in parallel; a failing source is skipped. */
export async function listLibrary(perSource = 8): Promise<
  { source: Omit<BlogSource, "feed" | "kind">; items: LibraryItem[]; error?: string }[]
> {
  return Promise.all(
    BLOG_SOURCES.map(async ({ feed: _feed, kind: _kind, ...source }) => {
      try {
        return { source, items: await listSourcePosts(source.id, perSource) };
      } catch (error) {
        return {
          source,
          items: [],
          error: error instanceof Error ? error.message : "Feed unavailable",
        };
      }
    }),
  );
}

/** Fetches the full published article text for a catalogued URL. */
export async function fetchArticle(url: string): Promise<{ title: string; body: string }> {
  const allowed = BLOG_SOURCES.some((source) => url.startsWith(new URL(source.homepage).origin));
  if (!allowed) throw new Error("URL is not part of the blog library catalogue");

  const cached = articleCache.get(url);
  if (cached && cached.expires > Date.now()) return cached.value;

  const html = await get(url);
  const main =
    /<article[\s\S]*?<\/article>/i.exec(html)?.[0] ??
    /<main[\s\S]*?<\/main>/i.exec(html)?.[0] ??
    html;
  const title =
    decode(/<meta property="og:title" content="([^"]+)"/i.exec(html)?.[1] ?? "") ||
    stripHtml(/<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html)?.[1] ?? "") ||
    decode(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? "Untitled post");
  const body = stripHtml(main);
  if (body.length < 200) throw new Error("Could not extract the article body from this post");

  const article = { title: title.split("\\")[0]!.trim().slice(0, 200), body: body.slice(0, 40_000) };
  articleCache.set(url, { value: article, expires: Date.now() + ARTICLE_TTL_MS });
  return article;
}
