"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { RichTextEditor } from "@/components/rich-text-editor";
import { Alert, Field, SubmitButton } from "@/components/ui";
import { sendJson } from "@/lib/client";

export function ConstitutionForm({
  initial,
}: {
  initial: { title: string; description: string; content: string };
}) {
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [content, setContent] = useState(initial.content);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);

    if (!content.replace(/<[^>]*>/g, "").trim()) {
      setMessage({ tone: "error", text: "Write the constitution text before saving." });
      return;
    }

    setBusy(true);
    const { ok, data } = await sendJson("/api/admin/constitution", "POST", { title, description, content });
    setBusy(false);

    setMessage(
      ok
        ? { tone: "success", text: "Saved. Members can read the updated version now." }
        : { tone: "error", text: data.error || "The constitution could not be saved." }
    );
  }

  return (
    <form onSubmit={save} className="card max-w-5xl p-4 sm:p-6">
      <div className="grid gap-5">
        <Field label="Title">
          <input required className="field" value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Short description">
          <input className="field" value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <div>
          <span className="label">Text</span>
          <RichTextEditor value={content} onChange={setContent} placeholder="Write or paste the constitution here…" />
        </div>
      </div>

      {message && <div className="mt-5"><Alert tone={message.tone}>{message.text}</Alert></div>}

      <SubmitButton busy={busy} icon={Save} className="mt-6 w-full sm:w-auto">Save and publish</SubmitButton>
    </form>
  );
}
