import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LoanDecision, LoanDisburse, RepaymentForm } from "@/components/loan-actions";
import { Alert, Badge, DetailList, PageHeader, Panel, StatusBadge, TableWrap } from "@/components/ui";
import { query } from "@/lib/db";
import { date, dateTime, money } from "@/lib/format";
import { requireStaffPage } from "@/lib/guards";
import { allows, permissions } from "@/lib/permissions";
import { LOAN_METHOD_LABELS, type LoanMethod } from "@/types/domain";

export const metadata: Metadata = { title: "Loan" };

export default async function LoanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireStaffPage();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const loanResult = await query<{
    id: string;
    loan_no: string;
    product_name: string;
    principal: string;
    annual_rate: string;
    term_months: number;
    interest_method: LoanMethod;
    status: string;
    purpose: string | null;
    outstanding_principal: string;
    applied_at: string;
    disbursed_at: string | null;
    decided_at: string | null;
    decision_note: string | null;
    member_id: string;
    member_no: string;
    name: string;
  }>(
    `SELECT l.id, l.loan_no, l.product_name, l.principal, l.annual_rate, l.term_months, l.interest_method,
            l.status, l.purpose, l.outstanding_principal, l.applied_at, l.disbursed_at, l.decided_at,
            l.decision_note, m.id AS member_id, m.member_no,
            concat_ws(' ', m.first_name, m.middle_name, m.last_name) AS name
       FROM loans l
       JOIN members m ON m.id = l.member_id
      WHERE l.id = $1 AND l.organization_id = $2`,
    [id, session.organizationId]
  );

  const loan = loanResult.rows[0];
  if (!loan) notFound();

  const [schedule, repayments] = await Promise.all([
    query<{
      installment_no: number;
      due_date: string;
      principal_due: string;
      interest_due: string;
      total_due: string;
      principal_paid: string;
      interest_paid: string;
      status: string;
    }>(
      `SELECT installment_no, due_date, principal_due, interest_due, total_due, principal_paid, interest_paid, status
         FROM loan_schedule WHERE loan_id = $1 ORDER BY installment_no`,
      [id]
    ),
    query<{ txn_no: string; amount: string; principal_amount: string; interest_amount: string; posted_at: string }>(
      `SELECT txn_no, amount, principal_amount, interest_amount, posted_at
         FROM loan_repayments WHERE loan_id = $1 ORDER BY posted_at DESC`,
      [id]
    ),
  ]);

  const todayIso = new Date().toISOString().slice(0, 10);
  const overdue = schedule.rows.filter((row) => row.status !== "PAID" && row.due_date.toString().slice(0, 10) < todayIso);
  const arrears = overdue.reduce(
    (sum, row) => sum + Number(row.total_due) - Number(row.principal_paid) - Number(row.interest_paid),
    0
  );
  const pending = loan.status === "PENDING_APPROVAL" || loan.status === "APPLICATION";

  return (
    <>
      <PageHeader
        back={{ href: "/admin/loans", label: "Loans" }}
        eyebrow={loan.loan_no}
        title={loan.product_name}
        description={`${loan.name} · ${loan.member_no}`}
        actions={<StatusBadge status={loan.status} />}
      />

      {arrears > 0 && (
        <div className="mb-5">
          <Alert tone="warning">
            {overdue.length} installment{overdue.length === 1 ? "" : "s"} overdue, totalling{" "}
            <strong>{money(arrears)}</strong>.
          </Alert>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <Panel title="Loan terms">
            <DetailList
              items={[
                ["Member", <Link key="m" href={`/admin/members/${loan.member_id}`} className="text-[var(--brand)] hover:underline">{loan.name}</Link>],
                ["Principal", money(loan.principal)],
                ["Interest rate", `${Number(loan.annual_rate)}% per year`],
                ["Term", `${loan.term_months} months`],
                ["Method", LOAN_METHOD_LABELS[loan.interest_method]],
                ["Outstanding principal", money(loan.outstanding_principal)],
                ["Applied", date(loan.applied_at)],
                ["Disbursed", date(loan.disbursed_at)],
                ["Purpose", loan.purpose],
                ["Decision note", loan.decision_note],
              ]}
            />
          </Panel>

          <Panel title="Repayment schedule" flush>
            {schedule.rows.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-[var(--muted)]">
                The schedule is created when the loan is disbursed.
              </p>
            ) : (
              <TableWrap>
                <table className="data-table stack-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Due</th>
                      <th className="num">Principal</th>
                      <th className="num">Interest</th>
                      <th className="num">Installment</th>
                      <th className="num">Paid</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedule.rows.map((row) => {
                      const late = row.status !== "PAID" && row.due_date.toString().slice(0, 10) < todayIso;
                      return (
                        <tr key={row.installment_no}>
                          <td className="cell-lead font-medium">Installment {row.installment_no}</td>
                          <td data-label="Due">{date(row.due_date)}</td>
                          <td data-label="Principal" className="num">{money(row.principal_due)}</td>
                          <td data-label="Interest" className="num">{money(row.interest_due)}</td>
                          <td data-label="Installment" className="num font-semibold">{money(row.total_due)}</td>
                          <td data-label="Paid" className="num">{money(Number(row.principal_paid) + Number(row.interest_paid))}</td>
                          <td data-label="Status">{late ? <Badge tone="red">Overdue</Badge> : <StatusBadge status={row.status} />}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </TableWrap>
            )}
          </Panel>

          <Panel title="Repayments received" flush>
            {repayments.rows.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-[var(--muted)]">No repayments have been posted.</p>
            ) : (
              <TableWrap>
                <table className="data-table stack-table">
                  <thead>
                    <tr>
                      <th>Reference</th>
                      <th>Date</th>
                      <th className="num">Principal</th>
                      <th className="num">Interest</th>
                      <th className="num">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {repayments.rows.map((row) => (
                      <tr key={row.txn_no}>
                        <td className="cell-lead font-medium">{row.txn_no}</td>
                        <td data-label="Date">{dateTime(row.posted_at)}</td>
                        <td data-label="Principal" className="num">{money(row.principal_amount)}</td>
                        <td data-label="Interest" className="num">{money(row.interest_amount)}</td>
                        <td data-label="Total" className="num font-semibold">{money(row.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          {pending && (
            <Panel title="Review application">
              <LoanDecision loanId={loan.id} canDecide={allows(session.role, permissions.decideLoans)} />
            </Panel>
          )}

          {loan.status === "APPROVED" && (
            <Panel title="Disburse loan">
              <LoanDisburse loanId={loan.id} canDisburse={allows(session.role, permissions.disburseLoans)} />
            </Panel>
          )}

          {loan.status === "ACTIVE" && allows(session.role, permissions.postRepayments) && (
            <Panel title="Post a repayment">
              <RepaymentForm loanId={loan.id} />
            </Panel>
          )}

          {loan.status === "REJECTED" && (
            <Alert tone="error">This application was rejected{loan.decided_at ? ` on ${date(loan.decided_at)}` : ""}.</Alert>
          )}
          {loan.status === "COMPLETED" && <Alert tone="success">This loan has been fully repaid.</Alert>}
        </div>
      </div>
    </>
  );
}
