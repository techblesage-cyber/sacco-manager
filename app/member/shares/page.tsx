import type { Metadata } from "next";
import { Landmark, Tag } from "lucide-react";
import { EmptyState, PageHeader, Panel, StatCard, StatusBadge, TableWrap } from "@/components/ui";
import { query } from "@/lib/db";
import { date, money } from "@/lib/format";
import { requireMemberPage } from "@/lib/guards";
import { getSharePrice } from "@/lib/org";

export const metadata: Metadata = { title: "Shares" };

export default async function SharesPage() {
  const session = await requireMemberPage();

  const [account, history, sharePrice] = await Promise.all([
    query<{ shares_count: number; share_value: string }>(
      "SELECT shares_count, share_value FROM shares_accounts WHERE member_id = $1",
      [session.memberId]
    ),
    query<{ txn_no: string; txn_type: string; shares_count: number; unit_value: string; amount: string; posted_at: string }>(
      `SELECT txn_no, txn_type, shares_count, unit_value, amount, posted_at
         FROM share_transactions WHERE member_id = $1 ORDER BY posted_at DESC LIMIT 100`,
      [session.memberId]
    ),
    getSharePrice(session.organizationId),
  ]);

  return (
    <>
      <PageHeader eyebrow="My money" title="Shares" description="Your shareholding in the SACCO." />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:max-w-3xl xl:grid-cols-3">
        <StatCard label="Number of shares" value={String(account.rows[0]?.shares_count ?? 0)} icon={Landmark} />
        <StatCard label="Total value" value={money(account.rows[0]?.share_value)} icon={Landmark} />
        <StatCard label="Price per share" value={sharePrice ? money(sharePrice) : "—"} hint="Current price" icon={Tag} />
      </div>

      <Panel title="Share history" flush className="mt-6">
        {history.rows.length === 0 ? (
          <EmptyState icon={Landmark} title="No share purchases yet" description="Purchases recorded by the SACCO will appear here." />
        ) : (
          <TableWrap>
            <table className="data-table stack-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th className="num">Shares</th>
                  <th className="num">Price</th>
                  <th className="num">Amount</th>
                </tr>
              </thead>
              <tbody>
                {history.rows.map((row) => (
                  <tr key={row.txn_no}>
                    <td className="cell-lead font-medium">{date(row.posted_at)}</td>
                    <td data-label="Type"><StatusBadge status={row.txn_type} /></td>
                    <td data-label="Shares" className="num">{row.shares_count}</td>
                    <td data-label="Price" className="num">{money(row.unit_value)}</td>
                    <td data-label="Amount" className="num font-semibold">{money(row.amount)}</td>
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
