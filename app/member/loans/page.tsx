import type { Metadata } from "next";
import { HandCoins } from "lucide-react";
import { Alert, Badge, EmptyState, PageHeader, StatusBadge, TableWrap } from "@/components/ui";
import { query } from "@/lib/db";
import { date, money } from "@/lib/format";
import { requireMemberPage } from "@/lib/guards";
import { LOAN_METHOD_LABELS, type LoanMethod } from "@/types/domain";

export const metadata: Metadata = { title: "Loans" };

type ScheduleRow = {
  loan_id: string;
  installment_no: number;
  due_date: string;
  total_due: string;
  paid: string;
  status: string;
};

export default async function MemberLoansPage() {
  const session = await requireMemberPage();

  const [loans, schedule] = await Promise.all([
    query<{
      id: string;
      loan_no: string;
      product_name: string;
      principal: string;
      annual_rate: string;
      term_months: number;
      interest_method: LoanMethod;
      status: string;
      outstanding_principal: string;
    }>(
      `SELECT id, loan_no, product_name, principal, annual_rate, term_months, interest_method, status, outstanding_principal
         FROM loans WHERE member_id = $1 ORDER BY created_at DESC`,
      [session.memberId]
    ),
    query<ScheduleRow>(
      `SELECT ls.loan_id, ls.installment_no, ls.due_date, ls.total_due,
              (ls.principal_paid + ls.interest_paid)::text AS paid, ls.status
         FROM loan_schedule ls JOIN loans l ON l.id = ls.loan_id
        WHERE l.member_id = $1 ORDER BY ls.loan_id, ls.installment_no`,
      [session.memberId]
    ),
  ]);

  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageHeader eyebrow="My money" title="Loans" description="Your loans, what you still owe and when payments are due." />

      {loans.rows.length === 0 ? (
        <div className="card">
          <EmptyState icon={HandCoins} title="No loans" description="Loan applications and active loans will appear here." />
        </div>
      ) : (
        <div className="space-y-5">
          {loans.rows.map((loan) => {
            const rows = schedule.rows.filter((row) => row.loan_id === loan.id);
            const late = rows.filter((row) => row.status !== "PAID" && row.due_date < todayIso);
            const nextDue = rows.find((row) => row.status !== "PAID");

            return (
              <section key={loan.id} className="card p-5 sm:p-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div>
                    <div className="text-xs text-[var(--muted)]">{loan.loan_no}</div>
                    <h2 className="mt-0.5 text-lg font-bold">{loan.product_name}</h2>
                    <div className="mt-2"><StatusBadge status={loan.status} /></div>
                  </div>
                  <div className="sm:text-right">
                    <div className="text-xs text-[var(--muted)]">Principal still owed</div>
                    <div className="mt-0.5 text-2xl font-bold tabular-nums">{money(loan.outstanding_principal)}</div>
                  </div>
                </div>

                {late.length > 0 && (
                  <div className="mt-4">
                    <Alert tone="warning">
                      {late.length} payment{late.length === 1 ? " is" : "s are"} overdue.
                    </Alert>
                  </div>
                )}

                <dl className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
                  {[
                    ["Amount borrowed", money(loan.principal)],
                    ["Interest rate", `${Number(loan.annual_rate)}% a year`],
                    ["Term", `${loan.term_months} months`],
                    ["Next payment", nextDue && loan.status === "ACTIVE" ? `${money(Number(nextDue.total_due) - Number(nextDue.paid))} on ${date(nextDue.due_date)}` : "—"],
                  ].map(([term, value]) => (
                    <div key={term}>
                      <dt className="text-xs text-[var(--muted)]">{term}</dt>
                      <dd className="mt-0.5 text-sm font-semibold">{value}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-3 text-xs text-[var(--muted)]">{LOAN_METHOD_LABELS[loan.interest_method]}</p>

                {rows.length > 0 && (
                  <details className="mt-5 border-t border-[var(--line)] pt-4">
                    <summary className="cursor-pointer text-sm font-semibold text-[var(--brand)]">Repayment schedule</summary>
                    <div className="-mx-5 mt-3 sm:-mx-6">
                      <TableWrap>
                        <table className="data-table stack-table">
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>Due</th>
                              <th className="num">Installment</th>
                              <th className="num">Paid</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((row) => (
                              <tr key={row.installment_no}>
                                <td className="cell-lead font-medium">Installment {row.installment_no}</td>
                                <td data-label="Due">{date(row.due_date)}</td>
                                <td data-label="Installment" className="num">{money(row.total_due)}</td>
                                <td data-label="Paid" className="num">{money(row.paid)}</td>
                                <td data-label="Status">
                                  {row.status !== "PAID" && row.due_date < todayIso ? <Badge tone="red">Overdue</Badge> : <StatusBadge status={row.status} />}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </TableWrap>
                    </div>
                  </details>
                )}
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
