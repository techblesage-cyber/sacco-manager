"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownToLine, Landmark } from "lucide-react";
import { Alert, Field, SubmitButton } from "@/components/ui";
import { sendJson } from "@/lib/client";
import { money } from "@/lib/format";

function useMemberLookup(memberNo: string) {
  const [state, setState] = useState<{ name?: string; status?: string; error?: string } | null>(null);

  useEffect(() => {
    const value = memberNo.trim();
    if (!value) {
      setState(null);
      return;
    }

    const timer = setTimeout(async () => {
      const response = await fetch(`/api/admin/members/lookup?no=${encodeURIComponent(value)}`);
      const data = await response.json().catch(() => ({}));
      setState(response.ok ? { name: data.name, status: data.status } : { error: data.error || "Not found" });
    }, 350);

    return () => clearTimeout(timer);
  }, [memberNo]);

  return state;
}

export function MemberField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const lookup = useMemberLookup(value);

  return (
    <Field label="Member number">
      <input
        required
        autoComplete="off"
        className="field"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {lookup?.name && (
        <span className="mt-1.5 block text-sm font-medium text-[var(--brand)]">
          {lookup.name}
          {lookup.status && lookup.status !== "ACTIVE" ? ` · ${lookup.status.toLowerCase()}` : ""}
        </span>
      )}
      {lookup?.error && <span className="mt-1.5 block text-sm text-red-600">{lookup.error}</span>}
    </Field>
  );
}

export function SavingsForm({ defaultMemberNo = "" }: { defaultMemberNo?: string }) {
  const router = useRouter();
  const [form, setForm] = useState({
    memberNo: defaultMemberNo,
    type: "DEPOSIT",
    amount: "",
    reference: "",
    description: "",
  });
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setOk("");
    setBusy(true);
    const { ok: success, data } = await sendJson<{ txnNo: string }>("/api/admin/savings", "POST", form);
    setBusy(false);

    if (!success) {
      setError(data.error || "The transaction could not be posted.");
      return;
    }

    setOk(`Posted ${data.txnNo}.`);
    setForm({ ...form, amount: "", reference: "", description: "" });
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand)]">
          <ArrowDownToLine size={18} />
        </div>
        <div>
          <h2 className="font-semibold">Post savings transaction</h2>
          <p className="text-xs text-[var(--muted)]">Balance and ledger update together.</p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <MemberField value={form.memberNo} onChange={(memberNo) => setForm({ ...form, memberNo })} />
        <Field label="Type">
          <select className="field" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="DEPOSIT">Deposit</option>
            <option value="WITHDRAWAL">Withdrawal</option>
          </select>
        </Field>
        <Field label="Amount (UGX)">
          <input
            required
            type="number"
            inputMode="decimal"
            min="1"
            step="0.01"
            className="field"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
        </Field>
        <Field label="Reference" hint="Receipt or slip number, if any.">
          <input className="field" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
        </Field>
        <Field label="Note">
          <textarea className="field" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </Field>
      </div>

      {error && <div className="mt-4"><Alert tone="error">{error}</Alert></div>}
      {ok && <div className="mt-4"><Alert tone="success">{ok}</Alert></div>}

      <SubmitButton busy={busy} className="mt-5 w-full">Post transaction</SubmitButton>
    </form>
  );
}

export function SharesForm({
  defaultMemberNo = "",
  sharePrice = null,
  canSetPrice = false,
}: {
  defaultMemberNo?: string;
  sharePrice?: number | null;
  canSetPrice?: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState({ memberNo: defaultMemberNo, shares: "", unitValue: "" });
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);

  const price = sharePrice ?? Number(form.unitValue);
  const total = Number(form.shares) * price;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setOk("");
    setBusy(true);
    const { ok: success, data } = await sendJson<{ txnNo: string }>(
      "/api/admin/shares",
      "POST",
      sharePrice ? { memberNo: form.memberNo, shares: form.shares } : form
    );
    setBusy(false);

    if (!success) {
      setError(data.error || "The share purchase could not be posted.");
      return;
    }

    setOk(`Posted ${data.txnNo}.`);
    setForm({ ...form, shares: "" });
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand)]">
          <Landmark size={18} />
        </div>
        <div>
          <h2 className="font-semibold">Record share purchase</h2>
          <p className="text-xs text-[var(--muted)]">Adds shares to the member's holding.</p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <MemberField value={form.memberNo} onChange={(memberNo) => setForm({ ...form, memberNo })} />
        <Field label="Number of shares">
          <input
            required
            type="number"
            inputMode="numeric"
            min="1"
            step="1"
            className="field"
            value={form.shares}
            onChange={(e) => setForm({ ...form, shares: e.target.value })}
          />
        </Field>
        {sharePrice ? (
          <div className="rounded-lg border border-[var(--line)] bg-slate-50 px-3 py-2.5 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[var(--muted)]">Price per share</span>
              <span className="font-semibold tabular-nums">{money(sharePrice)}</span>
            </div>
            {canSetPrice && (
              <a href="/admin/settings" className="mt-1 block text-xs font-semibold text-[var(--brand)]">
                Change the share price in Settings
              </a>
            )}
          </div>
        ) : (
          <Field
            label="Price per share (UGX)"
            hint={canSetPrice ? "Set a standard price in Settings so it fills in automatically." : "Ask an administrator to set the share price in Settings."}
          >
            <input
              required
              type="number"
              inputMode="decimal"
              min="1"
              step="0.01"
              className="field"
              value={form.unitValue}
              onChange={(e) => setForm({ ...form, unitValue: e.target.value })}
            />
          </Field>
        )}
        {total > 0 && Number.isFinite(total) && (
          <div className="rounded-lg bg-[var(--brand-soft)] px-3 py-2.5 text-sm">
            Total value <span className="font-semibold">{money(total)}</span>
          </div>
        )}
      </div>

      {error && <div className="mt-4"><Alert tone="error">{error}</Alert></div>}
      {ok && <div className="mt-4"><Alert tone="success">{ok}</Alert></div>}

      <SubmitButton busy={busy} className="mt-5 w-full">Record purchase</SubmitButton>
    </form>
  );
}

export function ReverseButton({ kind, txnNo }: { kind: "SAVINGS" | "SHARES"; txnNo: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function reverse() {
    const reason = window.prompt(`Reason for reversing ${txnNo}?`);
    if (!reason || reason.trim().length < 3) return;

    setBusy(true);
    const { ok, data } = await sendJson("/api/admin/transactions/reverse", "POST", { kind, txnNo, reason });
    setBusy(false);

    if (!ok) {
      window.alert(data.error || "The reversal could not be posted.");
      return;
    }
    router.refresh();
  }

  return (
    <button type="button" onClick={reverse} disabled={busy} className="btn btn-danger btn-sm">
      Reverse
    </button>
  );
}
