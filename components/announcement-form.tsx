"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Megaphone } from "lucide-react";
import { Alert, Field, SubmitButton } from "@/components/ui";
import { sendJson } from "@/lib/client";

export function AnnouncementForm() {
  const router = useRouter();
  const [form, setForm] = useState({ title: "", message: "", expiresAt: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const { ok, data } = await sendJson("/api/admin/announcements", "POST", form);
    setBusy(false);

    if (!ok) {
      setError(data.error || "The announcement could not be posted.");
      return;
    }

    setForm({ title: "", message: "", expiresAt: "" });
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card p-5 sm:p-6">
      <h2 className="font-semibold">New announcement</h2>
      <div className="mt-4 space-y-4">
        <Field label="Title">
          <input required className="field" maxLength={150} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </Field>
        <Field label="Message">
          <textarea required className="field" rows={4} maxLength={2000} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
        </Field>
        <Field label="Show until (optional)" hint="Leave blank to keep it visible until you hide it.">
          <input type="date" className="field" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
        </Field>
      </div>
      {error && <div className="mt-4"><Alert tone="error">{error}</Alert></div>}
      <SubmitButton busy={busy} icon={Megaphone} className="mt-5 w-full">Post announcement</SubmitButton>
    </form>
  );
}

export function AnnouncementRowActions({ id, active }: { id: string; active: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run(action: "activate" | "deactivate" | "delete") {
    if (action === "delete" && !window.confirm("Delete this announcement?")) return;
    setBusy(true);
    const { ok, data } = await sendJson("/api/admin/announcements", "PATCH", { id, action });
    setBusy(false);
    if (!ok) window.alert(data.error || "That change could not be saved.");
    else router.refresh();
  }

  return (
    <div className="flex gap-2">
      <button type="button" disabled={busy} className="btn btn-secondary btn-sm" onClick={() => run(active ? "deactivate" : "activate")}>
        {active ? "Hide" : "Show"}
      </button>
      <button type="button" disabled={busy} className="btn btn-danger btn-sm" onClick={() => run("delete")}>
        Delete
      </button>
    </div>
  );
}
