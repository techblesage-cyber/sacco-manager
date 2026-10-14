import type { Metadata } from "next";
import Link from "next/link";
import { HandCoins, Plus } from "lucide-react";
import { Badge, EmptyState, PageHeader, StatusBadge, TableWrap } from "@/components/ui";
import { query } from "@/lib/db";
import { date, money } from "@/lib/format";
import { requireStaffPage } from "@/lib/guards";
import { allows, permissions } from "@/lib/permissions";

export const metadata: Metadata = { title: "Loans" };

const FILTERS: { key: string; label: string; statuses: string[] }[] = [
  { key: "all", label: "All", statuses: [] },
  { key: "pending", label: "Pending", statuses: ["APPLICATION", "PENDING_APPROVAL", "PENDING_GUARANTORS"] },
  { key: "approved", label: "Approved", statuses: ["APPROVED"] },
  { key: "active", label: "Active", statuses: ["ACTIVE", "DISBURSED"] },
  { key: "closed", label: "Closed", statuses: ["COMPLETED", "REJECTED", "WRITTEN_OFF"] },
];

type Row = {
  id: string;
  loan_no: string;
  product_name: string;
  principal: string;
  outstanding_principal: string;
  status: string;
  applied_at: string;
  member_no: string;
  name: string;
  arrears: string;
};

export default async function LoansPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const session = await requireStaffPage();
  const params = await searchParams;
  const active = FILTERS.find((f) => f.key === params.filter) ?? FILTERS[0];

  const { rows } = await query<Row>(
    `SELECT l.id, l.loan_no, l.product_name, l.principal, l.outstanding_principal, l.status, l.applied_at,
            m.member_no, concat_ws(' ', m.first_name, m.last_name) AS name,
            coalesce((SELECT sum(total_due - principal_paid - interest_paid)
                        FROM loan_schedule
                       WHERE loan_id = l.id AND status <> 'PAID' AND due_date < current_date), 0)::text AS arrears
       FROM loans l
       JOIN members m ON m.id = l.member_id
      WHERE l.organization_id = $1
        AND (cardinality($2::text[]) = 0 OR l.status = ANY($2::text[]))
      ORDER BY l.created_at DESC
      LIMIT 100`,
    [session.organizationId, active.statuses]
  );

  return (
    <>
      <PageHeader
        eyebrow="Lending"
        title="Loans"
        description="Applications, approvals, active loans and repayments."
        actions={
          allows(session.role, permissions.originateLoans) && (
            <Link href="/admin/loans/new" className="btn btn-primary">
              <Plus size={17} /> New application
            </Link>
          )
        }
      />

      <div className="-mx-4 mb-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="segmented">
          {FILTERS.map((filter) => (
            <Link
              key={filter.key}
              href={filter.key === "all" ? "/admin/loans" : `/admin/loans?filter=${filter.key}`}
              aria-current={active.key === filter.key ? "page" : undefined}
            >
              {filter.label}
            </Link>
          ))}
        </div>
      </div>

      <section className="card overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState icon={HandCoins} title="No loans here" description="Loans matching this view will appear in this list." />
        ) : (
          <TableWrap>
            <table className="data-table stack-table">
              <thead>
                <tr>
                  <th>Loan</th>
                  <th>Member</th>
                  <th className="num">Principal</th>
                  <th className="num">Outstanding</th>
                  <th>Status</th>
                  <th>Applied</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="cell-lead">
                      <Link href={`/admin/loans/${row.id}`} className="font-semibold hover:text-[var(--brand)] hover:underline">
                        {row.loan_no}
                      </Link>
                      <div className="text-xs text-[var(--muted)]">{row.product_name}</div>
                    </td>
                    <td data-label="Member">
                      <div>{row.name}</div>
                      <div className="text-xs text-[var(--muted)]">{row.member_no}</div>
                    </td>
                    <td data-label="Principal" className="num">{money(row.principal)}</td>
                    <td data-label="Outstanding" className="num">{money(row.outstanding_principal)}</td>
                    <td data-label="Status">
                      <div className="flex flex-wrap items-center justify-end gap-1.5 md:justify-start">
                        <StatusBadge status={row.status} />
                        {Number(row.arrears) > 0 && <Badge tone="red">{money(row.arrears)} overdue</Badge>}
                      </div>
                    </td>
                    <td data-label="Applied">{date(row.applied_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </section>
    </>
  );
}
