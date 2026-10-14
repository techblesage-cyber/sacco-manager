"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { Alert, Field, SubmitButton } from "@/components/ui";

export function DocumentUploadForm({ categories }: { categories: { id: string; name: string }[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [published, setPublished] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    if (!file) {
      setError("Choose a file to upload.");
      return;
    }

    const data = new FormData();
    data.set("title", title);
    data.set("description", description);
    data.set("categoryId", categoryId);
    data.set("published", String(published));
    data.set("file", file);

    setBusy(true);
    try {
      const response = await fetch("/api/admin/documents", { method: "POST", body: data });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error || "The document could not be uploaded.");
        setBusy(false);
        return;
      }
      router.push("/admin/documents");
      router.refresh();
    } catch {
      setError("The server could not be reached. Check your connection and try again.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card max-w-3xl p-5 sm:p-7">
      <div className="grid gap-5">
        <Field label="Title">
          <input required className="field" maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Category">
          <select className="field" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">No category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Description">
          <textarea className="field" rows={3} maxLength={1000} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>

        <div>
          <span className="label">File</span>
          <label className="flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-[var(--line-strong)] bg-slate-50 px-6 py-8 text-center transition hover:border-[var(--brand)] hover:bg-[var(--brand-soft)]">
            <Upload size={22} className="text-[var(--muted)]" />
            <span className="mt-2 break-all text-sm font-semibold">{file ? file.name : "Choose a PDF, DOC or DOCX file"}</span>
            <span className="mt-1 text-xs text-[var(--muted)]">Up to 10 MB</span>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              className="sr-only"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>

        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" className="h-4 w-4" checked={published} onChange={(e) => setPublished(e.target.checked)} />
          Make this document visible to members
        </label>
      </div>

      {error && <div className="mt-5"><Alert tone="error">{error}</Alert></div>}

      <SubmitButton busy={busy} icon={Upload} className="mt-6 w-full sm:w-auto">Upload document</SubmitButton>
    </form>
  );
}
