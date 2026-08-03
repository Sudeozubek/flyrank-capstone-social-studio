import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { DEFAULT_CAMPAIGN_LANGUAGE } from "@/config/campaign-languages.config";
import { BrandContextFields } from "@/components/campaign/BrandContextFields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface LibraryItem {
  sourceId: string;
  sourceName: string;
  title: string;
  url: string;
  summary: string;
  image?: string | null;
  publishedAt: string | null;
}

export interface LibraryGroup {
  source: { id: string; name: string; homepage: string };
  items: LibraryItem[];
  error?: string | undefined;
}

export interface ComposerSubmit {
  mode: "paste" | "upload" | "library";
  campaignName?: string | undefined;
  brandName?: string | undefined;
  brandTone?: string | undefined;
  brandLanguage?: string | undefined;
  title?: string | undefined;
  body?: string | undefined;
  url?: string | null;
  file?: { kind: "markdown" | "pdf" | "docx"; filename: string; base64: string };
}

function kindFor(name: string): "markdown" | "pdf" | "docx" | null {
  const lower = name.toLowerCase();
  if (/\.(md|markdown|txt)$/.test(lower)) return "markdown";
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".docx")) return "docx";
  return null;
}

async function toBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

const ALL_SOURCES = "__all__";

export function CampaignComposer({
  onSubmit,
  busy,
  library,
  libraryLoading,
}: {
  onSubmit: (input: ComposerSubmit) => Promise<void> | void;
  busy: boolean;
  library: LibraryGroup[];
  libraryLoading: boolean;
}) {
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<string>(ALL_SOURCES);
  const [campaignName, setCampaignName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [brandTone, setBrandTone] = useState("");
  const [brandLanguage, setBrandLanguage] = useState(DEFAULT_CAMPAIGN_LANGUAGE);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const visibleGroups = useMemo(
    () => (sourceFilter === ALL_SOURCES ? library : library.filter((g) => g.source.id === sourceFilter)),
    [library, sourceFilter],
  );
  const posts = useMemo(() => visibleGroups.flatMap((group) => group.items), [visibleGroups]);
  const feedErrors = useMemo(
    () => visibleGroups.filter((group) => group.error),
    [visibleGroups],
  );

  const brand = () => ({
    brandName: brandName.trim() || undefined,
    brandTone: brandTone.trim() || undefined,
    brandLanguage: brandLanguage || DEFAULT_CAMPAIGN_LANGUAGE,
  });

  async function submitPaste() {
    if (body.trim().length < 40) {
      toast.error("Add at least 40 characters of blog body.");
      return;
    }
    await onSubmit({
      mode: "paste",
      title: title.trim() || undefined,
      body,
      url: url.trim() || null,
      ...brand(),
    });
    setBody("");
    setTitle("");
  }

  async function submitUpload() {
    if (!file) {
      toast.error("Choose a Markdown, PDF or DOCX file.");
      return;
    }
    const kind = kindFor(file.name);
    if (!kind) {
      toast.error("Only .md, .pdf and .docx files are supported.");
      return;
    }
    await onSubmit({
      mode: "upload",
      url: url.trim() || null,
      file: { kind, filename: file.name, base64: await toBase64(file) },
      ...brand(),
    });
    setFile(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  async function submitLibrary() {
    if (!selectedUrl) {
      toast.error("Pick a published post from the library.");
      return;
    }
    await onSubmit({
      mode: "library",
      url: selectedUrl,
      campaignName: campaignName.trim() || undefined,
      ...brand(),
    });
    setCampaignName("");
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <header className="mb-4">
        <h2 className="font-display text-lg text-foreground">New campaign</h2>
        <p className="text-sm text-muted-foreground">
          Start from a published blog post — pick one from the live blog library, paste it, or
          upload the document.
        </p>
      </header>

      <BrandContextFields
        className="mb-5"
        brandName={brandName}
        brandTone={brandTone}
        brandLanguage={brandLanguage}
        onBrandNameChange={setBrandName}
        onBrandToneChange={setBrandTone}
        onBrandLanguageChange={setBrandLanguage}
      />

      <Tabs defaultValue="library">
        <TabsList className="mb-4">
          <TabsTrigger value="library">Blog library</TabsTrigger>
          <TabsTrigger value="paste">Write / paste</TabsTrigger>
          <TabsTrigger value="upload">Upload document</TabsTrigger>
        </TabsList>

        <TabsContent value="library" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 min-w-0">
              <Label htmlFor="campaign-name">Campaign name (optional)</Label>
              <Input
                id="campaign-name"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="Falls back to the post title"
              />
            </div>
            <div className="space-y-2 min-w-0">
              <Label htmlFor="library-source">Company</Label>
              <Select
                value={sourceFilter}
                onValueChange={(value) => {
                  setSourceFilter(value);
                  setSelectedUrl(null);
                }}
              >
                <SelectTrigger id="library-source">
                  <SelectValue placeholder="All companies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_SOURCES}>All companies</SelectItem>
                  {library.map((group) => (
                    <SelectItem key={group.source.id} value={group.source.id}>
                      {group.source.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {feedErrors.map((group) => (
            <p key={group.source.id} className="text-xs text-destructive">
              {group.source.name}: {group.error}
            </p>
          ))}

          {libraryLoading && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-64 animate-pulse rounded-xl border border-border bg-background"
                />
              ))}
            </div>
          )}

          {!libraryLoading && posts.length === 0 && (
            <p className="text-sm text-muted-foreground">No published posts reachable right now.</p>
          )}

          {!libraryLoading && posts.length > 0 && (
            /* Two rows of three cards stay in view; the rest is reachable by scrolling. */
            <div className="max-h-[34rem] overflow-y-auto pr-1">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {posts.map((item) => (
                  <PostPreviewCard
                    key={item.url}
                    item={item}
                    active={selectedUrl === item.url}
                    onSelect={() =>
                      setSelectedUrl((current) => (current === item.url ? null : item.url))
                    }
                  />
                ))}
              </div>
            </div>
          )}

          <Button onClick={submitLibrary} disabled={busy} className="w-full sm:w-auto">
            {busy ? "Generating…" : "Generate campaign"}
          </Button>
        </TabsContent>

        <TabsContent value="paste" className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="composer-title">Title (optional)</Label>
            <Input
              id="composer-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Inferred from the first line when empty"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="composer-body">Blog body</Label>
            <Textarea
              id="composer-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={9}
              placeholder="Paste the published article here…"
              className="font-mono text-xs leading-relaxed"
            />
          </div>
          <UrlField url={url} setUrl={setUrl} />
          <Button onClick={submitPaste} disabled={busy} className="w-full sm:w-auto">
            {busy ? "Generating…" : "Generate campaign"}
          </Button>
        </TabsContent>

        <TabsContent value="upload" className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="composer-file">Markdown, PDF or DOCX</Label>
            <Input
              id="composer-file"
              type="file"
              ref={fileInput}
              accept=".md,.markdown,.txt,.pdf,.docx"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <p className="text-xs text-muted-foreground">
              Text is extracted on the server; the title falls back to the first heading.
            </p>
          </div>
          <UrlField url={url} setUrl={setUrl} />
          <Button onClick={submitUpload} disabled={busy} className="w-full sm:w-auto">
            {busy ? "Parsing…" : "Generate campaign"}
          </Button>
        </TabsContent>
      </Tabs>
    </section>
  );
}

function PostPreviewCard({
  item,
  active,
  onSelect,
}: {
  item: LibraryItem;
  active: boolean;
  onSelect: () => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(item.image) && !imageFailed;
  const published = formatDate(item.publishedAt);

  return (
    <div
      className={
        "flex h-72 w-full flex-col overflow-hidden rounded-xl border text-left transition " +
        (active
          ? "border-primary bg-primary/10 ring-1 ring-primary/40"
          : "border-border bg-background hover:border-primary/50")
      }
    >
      <div className="relative h-28 shrink-0 overflow-hidden border-b border-border bg-muted">
        {showImage ? (
          <img
            src={item.image as string}
            alt={item.title}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImageFailed(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          /* No feed artwork: fall back to a typographic monogram tile. */
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/15 via-transparent to-accent/15">
            <span className="font-display text-3xl tracking-tight text-foreground/70">
              {item.sourceName.slice(0, 2).toUpperCase()}
            </span>
          </div>
        )}

        <span className="absolute left-2 top-2 rounded-md bg-background/85 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground backdrop-blur">
          {item.sourceName}
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1 p-3">
        <span className="line-clamp-2 text-sm font-medium text-foreground">{item.title}</span>
        {item.summary && (
          <span className="line-clamp-3 text-xs text-muted-foreground">{item.summary}</span>
        )}
        <span className="mt-auto truncate font-mono text-[10px] text-muted-foreground">
          {published ?? new URL(item.url).hostname}
        </span>

        <div className="mt-2 flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={active ? "default" : "secondary"}
            aria-pressed={active}
            onClick={onSelect}
            className="flex-1"
          >
            {active ? "Selected" : "Select"}
          </Button>
          <Button type="button" size="sm" variant="outline" asChild className="flex-1">
            <a href={item.url} target="_blank" rel="noreferrer noopener">
              Open
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}

function UrlField({ url, setUrl }: { url: string; setUrl: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <Label htmlFor="composer-url">Canonical blog URL (optional)</Label>
      <Input
        id="composer-url"
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://blog.example.com/post"
      />
    </div>
  );
}
