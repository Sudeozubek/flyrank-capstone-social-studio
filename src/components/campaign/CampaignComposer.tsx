import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface LibraryGroup {
  source: { id: string; name: string; homepage: string };
  items: {
    sourceId: string;
    sourceName: string;
    title: string;
    url: string;
    summary: string;
    publishedAt: string | null;
  }[];
  error?: string | undefined;
}

export interface ComposerSubmit {
  mode: "paste" | "upload" | "library";
  campaignName?: string | undefined;
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
  const [campaignName, setCampaignName] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function submitPaste() {
    if (body.trim().length < 40) {
      toast.error("Add at least 40 characters of blog body.");
      return;
    }
    await onSubmit({ mode: "paste", title: title.trim() || undefined, body, url: url.trim() || null });
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

      <Tabs defaultValue="library">
        <TabsList className="mb-4">
          <TabsTrigger value="library">Blog library</TabsTrigger>
          <TabsTrigger value="paste">Write / paste</TabsTrigger>
          <TabsTrigger value="upload">Upload document</TabsTrigger>
        </TabsList>

        <TabsContent value="library" className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="campaign-name">Campaign name (optional)</Label>
            <Input
              id="campaign-name"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="Falls back to the post title"
            />
          </div>

          <div className="max-h-[22rem] space-y-4 overflow-y-auto pr-1">
            {libraryLoading && (
              <p className="text-sm text-muted-foreground">Fetching published posts…</p>
            )}
            {!libraryLoading && library.length === 0 && (
              <p className="text-sm text-muted-foreground">No blog sources reachable right now.</p>
            )}
            {library.map((group) => (
              <div key={group.source.id} className="space-y-2">
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  {group.source.name}
                </p>
                {group.error && <p className="text-xs text-destructive">{group.error}</p>}
                {group.items.map((item) => {
                  const active = selectedUrl === item.url;
                  return (
                    <button
                      key={item.url}
                      type="button"
                      onClick={() => setSelectedUrl(item.url)}
                      className={
                        "w-full rounded-xl border p-3 text-left transition " +
                        (active
                          ? "border-primary bg-primary/10"
                          : "border-border bg-background hover:border-primary/50")
                      }
                    >
                      <span className="block text-sm font-medium text-foreground">{item.title}</span>
                      {item.summary && (
                        <span className="mt-1 block line-clamp-2 text-xs text-muted-foreground">
                          {item.summary}
                        </span>
                      )}
                      <span className="mt-1 block truncate font-mono text-[10px] text-muted-foreground">
                        {item.url}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

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
