"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, SubmitButton } from "@/components/ui";
import { sendJson } from "@/lib/client";

export function ComplaintResponseForm({
  id,
  status,
  response,
}: {
  id: string;
  status: string;
  response: string | null;
}) {
  const router = useRouter();
  const [text, setText] = useState(response ?? "");
  const [next, setNext] = useState(status === "OPEN" ? "IN_REVIEW" : status);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setBusy(true);
    const { ok, data } = await sendJson("/api/admin/complaints", "PATCH", { id, status: next, response: text });
    setBusy(false);

    if (!ok) {
      setMessage({ tone: "error", text: data.error || "The update could not be saved." });
      return;
    }

    setMessage({ tone: "success", text: "Saved." });
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mt-5 border-t border-[var(--line)] pt-5">
      <div className="grid gap-3 md:grid-cols-[190px_1fr]">
        <select className="field" value={next} onChange={(e) => setNext(e.target.value)} aria-label="Status">
          <option value="OPEN">Open</option>
          <option value="IN_REVIEW">In review</option>
          <option value="RESOLVED">Resolved</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <textarea
          className="field"
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write your response to the member"
        />
      </div>
      {message && <div className="mt-3"><Alert tone={message.tone}>{message.text}</Alert></div>}
      <SubmitButton busy={busy} className="mt-3 w-full sm:w-auto">Save response</SubmitButton>
    </form>
  );
}
