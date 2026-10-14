import type { Metadata } from "next";
import { BarChart3, Download, FileText, Landmark, Users, WalletCards } from "lucide-react";
import { PageHeader, Panel } from "@/components/ui";
import { query } from "@/lib/db";
import { money } from "@/lib/format";
import { requireStaffPage } from "@/lib/guards";
import { permissions } from "@/lib/permissions";

export const metadata: Metadata = { title: "Reports" };

const REPORTS = [
  { key: "members", title: "Member register", description: "Every member with contact details and status.", icon: Users },
  { key: "savings", title: "Savings balances", description: "Current balance on each savings account.", icon: WalletCards },
  { key: "shares", title: "Shareholding", description: "Shares and share value held by each member.", icon: Landmark },
  { key: "loans", title: "Loan portfolio", description: "All loans with outstanding balances and overdue amounts.", icon: BarChart3 },
  { key: "transactions", title: "Savings transactions", description: "The full savings ledger, newest first.", icon: FileText },
];

export default async function ReportsPage() {
  const session = await requireStaffPage(permissions.viewReports);
  const org = session.organizationId;

  const [savings, shares, loans, arrears] = await Promise.all([
    query<{ v: string }>("SELECT coalesce(sum(balance), 0)::text AS v FROM savings_accounts WHERE organization_id = $1", [org]),
    query<{ v: string }>("SELECT coalesce(sum(share_value), 0)::text AS v FROM shares_accounts WHERE organization_id = $1", [org]),
    query<{ v: string }>("SELECT coalesce(sum(outstanding_principal), 0)::text AS v FROM loans WHERE organization_id = $1 AND status = 'ACTIVE'", [org]),
    query<{ v: string }>(
      `SELECT coalesce(sum(ls.total_due - ls.principal_paid - ls.interest_paid), 0)::text AS v
         FROM loan_schedule ls JOIN loans l ON l.id = ls.loan_id
        WHERE l.organization_id = $1 AND l.status = 'ACTIVE' AND ls.status <> 'PAID' AND ls.due_date < current_date`,
      [org]
    ),
  ]);

  const summary: [string, string][] = [
    ["Member savings", money(savings.rows[0].v)],
    ["Share capital", money(shares.rows[0].v)],
    ["Loans outstanding", money(loans.rows[0].v)],
    ["Overdue repayments", money(arrears.rows[0].v)],
  ];

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Reports"
        description="Export the SACCO's records as spreadsheets that open in Excel."
      />

      <Panel title="Position today" className="mb-6">
        <dl className="grid grid-cols-2 gap-5 lg:grid-cols-4">
          {summary.map(([term, value]) => (
            <div key={term}>
              <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{term}</dt>
              <dd className="mt-1 text-lg font-bold tabular-nums sm:text-xl">{value}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {REPORTS.map((report) => (
          <div key={report.key} className="card flex flex-col p-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand)]">
              <report.icon size={20} />
            </span>
            <h2 className="mt-4 font-semibold">{report.title}</h2>
            <p className="mt-1 flex-1 text-sm text-[var(--muted)]">{report.description}</p>
            <a href={`/api/admin/reports/${report.key}`} className="btn btn-secondary mt-5">
              <Download size={16} /> Download CSV
            </a>
          </div>
        ))}
      </div>
    </>
  );
}
