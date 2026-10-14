"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { HandCoins } from "lucide-react";
import { Alert, Field, SubmitButton } from "@/components/ui";
import { MemberField } from "@/components/transaction-form";
import { sendJson } from "@/lib/client";
import { addMonths, buildSchedule, summarize } from "@/lib/loan";
import { money, today } from "@/lib/format";
import { LOAN_METHOD_LABELS, type LoanMethod } from "@/types/domain";

export function LoanForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    memberNo: "",
    productName: "",
    principal: "",
    annualRate: "",
    termMonths: "",
    method: "REDUCING_EMI" as LoanMethod,
    purpose: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const preview = useMemo(() => {
    const principal = Number(form.principal);
    const annualRate = Number(form.annualRate);
    const termMonths = Number(form.termMonths);

    if (!(principal > 0) || !(termMonths >= 1) || !Number.isInteger(termMonths) || annualRate < 0 || form.annualRate === "") {
      return null;
    }

    const schedule = buildSchedule({
      principal,
      annualRate,
      termMonths,
      method: form.method,
      firstDueDate: addMonths(today(), 1),
    });
    return { first: schedule[0], last: schedule[schedule.length - 1], totals: summarize(schedule) };
  }, [form.principal, form.annualRate, form.termMonths, form.method]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const { ok, data } = await sendJson<{ id: string }>("/api/admin/loans", "POST", form);

    if (!ok) {
      setBusy(false);
      setError(data.error || "The loan could not be recorded.");
      return;
    }

    router.push(`/admin/loans/${data.id}`);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
      <form onSubmit={submit} className="card p-5 sm:p-7">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <MemberField value={form.memberNo} onChange={(memberNo) => setForm({ ...form, memberNo })} />
          </div>
          <Field label="Loan product" hint="For example: Development loan" className="sm:col-span-2">
            <input required className="field" value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} />
          </Field>
          <Field label="Amount (UGX)">
            <input required type="number" inputMode="decimal" min="1" step="0.01" className="field" value={form.principal} onChange={(e) => setForm({ ...form, principal: e.target.value })} />
          </Field>
          <Field label="Interest rate (% per year)">
            <input required type="number" inputMode="decimal" min="0" step="0.01" className="field" value={form.annualRate} onChange={(e) => setForm({ ...form, annualRate: e.target.value })} />
          </Field>
          <Field label="Term (months)">
            <input required type="number" inputMode="numeric" min="1" max="360" step="1" className="field" value={form.termMonths} onChange={(e) => setForm({ ...form, termMonths: e.target.value })} />
          </Field>
          <Field label="Interest method">
            <select className="field" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value as LoanMethod })}>
              {(Object.keys(LOAN_METHOD_LABELS) as LoanMethod[]).map((method) => (
                <option key={method} value={method}>{LOAN_METHOD_LABELS[method]}</option>
              ))}
            </select>
          </Field>
          <Field label="Purpose" className="sm:col-span-2">
            <textarea className="field" rows={2} value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} />
          </Field>
        </div>

        {error && <div className="mt-5"><Alert tone="error">{error}</Alert></div>}

        <div className="mt-6">
          <SubmitButton busy={busy} icon={HandCoins} className="w-full sm:w-auto">Submit for approval</SubmitButton>
        </div>
      </form>

      <aside className="card h-fit p-5 sm:p-6">
        <h2 className="font-semibold">Repayment preview</h2>
        {preview ? (
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--muted)]">First installment</dt>
              <dd className="font-semibold tabular-nums">{money(preview.first.total)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--muted)]">Last installment</dt>
              <dd className="font-semibold tabular-nums">{money(preview.last.total)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-[var(--line)] pt-3">
              <dt className="text-[var(--muted)]">Total interest</dt>
              <dd className="font-semibold tabular-nums">{money(preview.totals.interest)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--muted)]">Total repayable</dt>
              <dd className="font-semibold tabular-nums">{money(preview.totals.total)}</dd>
            </div>
          </dl>
        ) : (
          <p className="mt-3 text-sm text-[var(--muted)]">
            Enter the amount, rate and term to see what the member will repay.
          </p>
        )}
      </aside>
    </div>
  );
}
