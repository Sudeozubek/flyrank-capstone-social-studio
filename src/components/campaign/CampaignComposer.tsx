import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface ComposerSubmit {
  mode: "paste" | "upload";
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
}: {
  onSubmit: (input: ComposerSubmit) => Promise<void> | void;
  busy: boolean;
}) {
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

  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <header className="mb-4">
        <h2 className="font-display text-lg text-foreground">New campaign</h2>
        <p className="text-sm text-muted-foreground">
          Start from a published blog post — paste it, or upload the document.
        </p>
      </header>

      <Tabs defaultValue="paste">
        <TabsList className="mb-4">
          <TabsTrigger value="paste">Write / paste</TabsTrigger>
          <TabsTrigger value="upload">Upload document</TabsTrigger>
        </TabsList>

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
