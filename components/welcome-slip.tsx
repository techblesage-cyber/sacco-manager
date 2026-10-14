"use client";

import { useEffect, useState } from "react";
import { Printer } from "lucide-react";

export function WelcomeSlip({
  saccoName,
  saccoCode,
  memberName,
  memberNo,
  pin,
}: {
  saccoName: string;
  saccoCode: string;
  memberName?: string;
  memberNo: string;
  pin: string;
}) {
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  function print() {
    const clear = () => {
      document.body.classList.remove("print-slip");
      window.removeEventListener("afterprint", clear);
    };
    document.body.classList.add("print-slip");
    window.addEventListener("afterprint", clear);
    window.print();
  }

  const rows: [string, string][] = [
    ["Website", origin ? `${origin}/login` : ""],
    ["SACCO code", saccoCode],
    ["Member number", memberNo],
    ["Temporary PIN", pin],
  ];

  return (
    <div>
      <div className="slip rounded-xl border border-dashed border-[var(--line-strong)] bg-white p-5 text-left">
        <div className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Member sign-in details</div>
        <div className="mt-1 text-lg font-bold">{saccoName}</div>
        {memberName && <div className="text-sm text-[var(--muted)]">{memberName}</div>}

        <dl className="mt-4 space-y-2.5">
          {rows.map(([term, value]) => (
            <div key={term} className="flex items-baseline justify-between gap-4 border-b border-[var(--line)] pb-2">
              <dt className="text-sm text-[var(--muted)]">{term}</dt>
              <dd className="break-all text-right font-mono text-base font-semibold">{value || "—"}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-4 text-xs text-[var(--muted)]">
          Keep this slip private. You will be asked to choose a new PIN the first time you sign in.
        </p>
      </div>

      <button type="button" onClick={print} className="btn btn-secondary no-print mt-3 w-full">
        <Printer size={16} /> Print sign-in slip
      </button>
    </div>
  );
}
