"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote, Check, X } from "lucide-react";
import { Alert, Field, SubmitButton } from "@/components/ui";
import { sendJson } from "@/lib/client";
import { money, today } from "@/lib/format";

export function LoanDecision({ loanId, canDecide }: { loanId: string; canDecide: boolean }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  if (!canDecide) {
    return <p className="text-sm text-[var(--muted)]">Waiting for an approver to review this application.</p>;
  }

  async function act(action: "approve" | "reject") {
    setError("");
    if (action === "reject" && note.trim().length < 3) {
      setError("Write a short reason before rejecting.");
      return;
    }
    setBusy(action);
    const { ok, data } = await sendJson(`/api/admin/loans/${loanId}`, "PATCH", { action, note });
    setBusy("");

    if (!ok) {
      setError(data.error || "That could not be saved.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Field label="Decision note" hint="Required when rejecting.">
        <textarea className="field" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      {error && <Alert tone="error">{error}</Alert>}
      <div className="flex flex-wrap gap-3">
        <button type="button" disabled={Boolean(busy)} onClick={() => act("approve")} className="btn btn-primary">
          <Check size={17} /> Approve
        </button>
        <button type="button" disabled={Boolean(busy)} onClick={() => act("reject")} className="btn btn-danger">
          <X size={17} /> Reject
        </button>
      </div>
    </div>
  );
}

export function LoanDisburse({ loanId, canDisburse }: { loanId: string; canDisburse: boolean }) {
  const router = useRouter();
  const [date, setDate] = useState(today());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!canDisburse) {
    return <p className="text-sm text-[var(--muted)]">Approved. A treasurer or administrator can now disburse the funds.</p>;
  }

  async function disburse(event: React.FormEvent) {
    event.preventDefault();
    if (!window.confirm("Disburse this loan and create its repayment schedule?")) return;
    setError("");
    setBusy(true);
    const { ok, data } = await sendJson(`/api/admin/loans/${loanId}`, "PATCH", { action: "disburse", date });
    setBusy(false);

    if (!ok) {
      setError(data.error || "The loan could not be disbursed.");
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={disburse} className="space-y-4">
      <Field label="Disbursement date" hint="The first installment falls due one month after this date.">
        <input required type="date" className="field" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      {error && <Alert tone="error">{error}</Alert>}
      <SubmitButton busy={busy} icon={Banknote}>Disburse loan</SubmitButton>
    </form>
  );
}

export function RepaymentForm({ loanId }: { loanId: string }) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setOk("");
    setBusy(true);
    const { ok: success, data } = await sendJson<{ txnNo: string; principal: number; interest: number; completed: boolean }>(
      `/api/admin/loans/${loanId}/repayments`,
      "POST",
      { amount }
    );
    setBusy(false);

    if (!success) {
      setError(data.error || "The repayment could not be posted.");
      return;
    }

    setOk(
      `Posted ${data.txnNo}: ${money(data.principal)} principal and ${money(data.interest)} interest.` +
        (data.completed ? " The loan is now fully repaid." : "")
    );
    setAmount("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Amount received (UGX)" hint="Applied to the oldest unpaid installment first, interest before principal.">
        <input
          required
          type="number"
          inputMode="decimal"
          min="1"
          step="0.01"
          className="field"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </Field>
      {error && <Alert tone="error">{error}</Alert>}
      {ok && <Alert tone="success">{ok}</Alert>}
      <SubmitButton busy={busy} icon={Banknote}>Post repayment</SubmitButton>
    </form>
  );
}
