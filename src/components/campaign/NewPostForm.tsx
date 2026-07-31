import { useState } from "react";
import { ActionButton } from "./ActionButton";

interface Props {
  busy: boolean;
  error?: string | null;
  onCreate: (input: { title: string; body: string; url?: string }) => void;
}

/**
 * Lets the user add their own blog post — the seeded three are demo content only.
 * Mirrors the server-side zod rules so the feedback is immediate.
 */
export function NewPostForm({ busy, error, onCreate }: Props) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");

  const valid = title.trim().length >= 3 && body.trim().length >= 20;
  const field =
    "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-accent-strong";

  const submit = () => {
    if (!valid || busy) return;
    onCreate({ title, body, ...(url.trim() ? { url: url.trim() } : {}) });
    setTitle("");
    setBody("");
    setUrl("");
  };

  return (
    <section className="panel p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="eyebrow">Your blog post</h2>
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-md border border-border px-2 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:border-accent-strong/50"
        >
          {open ? "close" : "+ add"}
        </button>
      </div>

      {open ? (
        <div className="mt-3 flex flex-col gap-2">
          <input
            className={field}
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            aria-label="Post title"
          />
          <textarea
            className={`${field} min-h-28 resize-y`}
            placeholder="Body — captions and image variants are generated from this text (min 20 chars)"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            aria-label="Post body"
          />
          <input
            className={field}
            placeholder="https://your-blog.example/post (optional)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            aria-label="Post URL"
          />
          <ActionButton variant="primary" disabled={!valid || busy} onClick={submit}>
            {busy ? "Adding…" : "Add post"}
          </ActionButton>
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          <p className="text-[11px] text-muted-foreground">
            The three sample posts are demo seeds — your posts run through the same pipeline.
          </p>
        </div>
      ) : null}
    </section>
  );
}
