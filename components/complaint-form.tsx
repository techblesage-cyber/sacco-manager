"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquareWarning } from "lucide-react";
import { Alert, Field, SubmitButton } from "@/components/ui";
import { sendJson } from "@/lib/client";

export function ComplaintForm() {
  const router = useRouter();
  const [form, setForm] = useState({ category: "TRANSACTION", subject: "", description: "", transactionNo: "" });
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setOk("");
    setBusy(true);
    const { ok: success, data } = await sendJson<{ referenceNo: string }>("/api/member/complaints", "POST", form);
    setBusy(false);

    if (!success) {
      setError(data.error || "Your message could not be sent.");
      return;
    }

    setOk(`Thank you. Your reference is ${data.referenceNo}.`);
    setForm({ ...form, subject: "", description: "", transactionNo: "" });
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card h-fit p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand)]">
          <MessageSquareWarning size={18} />
        </div>
        <div>
          <h2 className="font-semibold">Contact the SACCO</h2>
          <p className="text-xs text-[var(--muted)]">Raise an issue and follow the reply here.</p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <Field label="About">
          <select className="field" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            <option value="TRANSACTION">A transaction</option>
            <option value="LOAN">A loan</option>
            <option value="SAVINGS">My savings</option>
            <option value="SERVICE">Our service</option>
            <option value="OTHER">Something else</option>
          </select>
        </Field>
        <Field label="Transaction number (optional)" hint="Copy it from your statement if this is about one posting.">
          <input className="field" value={form.transactionNo} onChange={(e) => setForm({ ...form, transactionNo: e.target.value })} />
        </Field>
        <Field label="Subject">
          <input required minLength={3} className="field" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
        </Field>
        <Field label="What happened?">
          <textarea required minLength={10} rows={5} className="field" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </Field>
      </div>

      {error && <div className="mt-4"><Alert tone="error">{error}</Alert></div>}
      {ok && <div className="mt-4"><Alert tone="success">{ok}</Alert></div>}

      <SubmitButton busy={busy} className="mt-5 w-full">Send message</SubmitButton>
    </form>
  );
}
