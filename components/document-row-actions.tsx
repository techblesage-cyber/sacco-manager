"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendJson } from "@/lib/client";

export function DocumentRowActions({ id, published }: { id: string; published: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    const { ok, data } = await sendJson(`/api/admin/documents/${id}`, "PATCH", { published: !published });
    setBusy(false);
    if (!ok) window.alert(data.error || "That change could not be saved.");
    else router.refresh();
  }

  async function remove() {
    if (!window.confirm("Delete this document permanently?")) return;
    setBusy(true);
    const { ok, data } = await sendJson(`/api/admin/documents/${id}`, "DELETE");
    setBusy(false);
    if (!ok) window.alert(data.error || "The document could not be deleted.");
    else router.refresh();
  }

  return (
    <div className="flex flex-wrap justify-end gap-2">
      <a href={`/api/documents/${id}`} className="btn btn-secondary btn-sm">Download</a>
      <button type="button" disabled={busy} onClick={toggle} className="btn btn-secondary btn-sm">
        {published ? "Hide" : "Publish"}
      </button>
      <button type="button" disabled={busy} onClick={remove} className="btn btn-danger btn-sm">Delete</button>
    </div>
  );
}
