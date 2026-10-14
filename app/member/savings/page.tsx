import type { Metadata } from "next";
import { PiggyBank, WalletCards } from "lucide-react";
import { EmptyState, PageHeader, Panel, StatusBadge, TableWrap } from "@/components/ui";
import { query } from "@/lib/db";
import { date, money } from "@/lib/format";
import { requireMemberPage } from "@/lib/guards";

export const metadata: Metadata = { title: "Savings" };

export default async function SavingsPage() {
  const session = await requireMemberPage();

  const [accounts, transactions] = await Promise.all([
    query<{ account_no: string; product_name: string; balance: string; status: string }>(
      "SELECT account_no, product_name, balance, status FROM savings_accounts WHERE member_id = $1 ORDER BY created_at",
      [session.memberId]
    ),
    query<{ txn_no: string; txn_type: string; amount: string; posted_at: string; reference: string | null; description: string | null }>(
      `SELECT txn_no, txn_type, amount, posted_at, reference, description
         FROM savings_transactions WHERE member_id = $1 ORDER BY posted_at DESC LIMIT 100`,
      [session.memberId]
    ),
  ]);

  return (
    <>
      <PageHeader eyebrow="My money" title="Savings" description="Your balance and the deposits and withdrawals posted to it." />

      <div className="grid gap-4 md:grid-cols-2">
        {accounts.rows.map((account) => (
          <div key={account.account_no} className="card p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand)]">
                  <PiggyBank size={20} />
                </span>
                <div>
                  <div className="font-semibold">{account.product_name}</div>
                  <div className="text-xs text-[var(--muted)]">{account.account_no}</div>
                </div>
              </div>
              <StatusBadge status={account.status} />
            </div>
            <div className="mt-6 text-3xl font-bold tracking-tight tabular-nums">{money(account.balance)}</div>
            <div className="mt-1 text-sm text-[var(--muted)]">Current balance</div>
          </div>
        ))}
      </div>

      <Panel title="Transaction history" flush className="mt-6">
        {transactions.rows.length === 0 ? (
          <EmptyState icon={WalletCards} title="No transactions yet" description="Posted deposits and withdrawals will appear here." />
        ) : (
          <TableWrap>
            <table className="data-table stack-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Reference</th>
                  <th>Type</th>
                  <th className="num">Amount</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {transactions.rows.map((row) => (
                  <tr key={row.txn_no}>
                    <td className="cell-lead font-medium">{date(row.posted_at)}</td>
                    <td data-label="Reference">{row.reference || row.txn_no}</td>
                    <td data-label="Type"><StatusBadge status={row.txn_type} /></td>
                    <td data-label="Amount" className="num font-semibold">{money(row.amount)}</td>
                    <td data-label="Note" className="text-[var(--muted)]">{row.description || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </Panel>
    </>
  );
}
