import type { Metadata } from "next";
import { Receipt } from "lucide-react";
import { PrintButton } from "@/components/print-button";
import { Badge, EmptyState, PageHeader, StatusBadge, TableWrap } from "@/components/ui";
import { query } from "@/lib/db";
import { date, money } from "@/lib/format";
import { requireMemberPage } from "@/lib/guards";

export const metadata: Metadata = { title: "Statement" };

export default async function StatementPage() {
  const session = await requireMemberPage();

  const { rows } = await query<{
    txn_no: string;
    type: string;
    source: string;
    amount: string;
    posted_at: string;
    note: string | null;
  }>(
    `SELECT txn_no, txn_type AS type, 'Savings' AS source, amount, posted_at, coalesce(description, reference) AS note
       FROM savings_transactions WHERE member_id = $1
     UNION ALL
     SELECT txn_no, 'REPAYMENT', 'Loan', amount, posted_at, NULL::text
       FROM loan_repayments WHERE member_id = $1
     UNION ALL
     SELECT txn_no, txn_type, 'Shares', amount, posted_at, shares_count::text || ' shares'
       FROM share_transactions WHERE member_id = $1
     ORDER BY posted_at DESC
     LIMIT 200`,
    [session.memberId]
  );

  return (
    <>
      <PageHeader
        eyebrow="My records"
        title="Statement"
        description="Savings, share and loan repayment entries, newest first."
        actions={<PrintButton />}
      />

      <section className="card overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState icon={Receipt} title="No entries yet" description="Your transactions will appear here once they are posted." />
        ) : (
          <TableWrap>
            <table className="data-table stack-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Account</th>
                  <th>Type</th>
                  <th className="num">Amount</th>
                  <th>Reference</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.txn_no}>
                    <td className="cell-lead font-medium">{date(row.posted_at)}</td>
                    <td data-label="Account">{row.source}</td>
                    <td data-label="Type">
                      {row.type === "REPAYMENT" ? <Badge tone="blue">Repayment</Badge> : <StatusBadge status={row.type} />}
                    </td>
                    <td data-label="Amount" className="num font-semibold">{money(row.amount)}</td>
                    <td data-label="Reference" className="text-[var(--muted)]">
                      {row.txn_no}
                      {row.note ? ` · ${row.note}` : ""}
                    </td>
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
