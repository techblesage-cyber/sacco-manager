import type { Metadata } from "next";
import Link from "next/link";
import { Landmark, PiggyBank, Tag, WalletCards } from "lucide-react";
import { ReverseButton, SavingsForm, SharesForm } from "@/components/transaction-form";
import { EmptyState, PageHeader, Panel, StatCard, StatusBadge, TableWrap } from "@/components/ui";
import { query } from "@/lib/db";
import { dateTime, formatNumber, money } from "@/lib/format";
import { requireStaffPage } from "@/lib/guards";
import { getSharePrice } from "@/lib/org";
import { allows, permissions } from "@/lib/permissions";

export const metadata: Metadata = { title: "Savings and shares" };

type Row = {
  txn_no: string;
  txn_type: string;
  amount: string;
  posted_at: string;
  description: string | null;
  member_no: string;
  name: string;
  reversed: boolean;
  detail: string | null;
};

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; memberNo?: string }>;
}) {
  const session = await requireStaffPage();
  const params = await searchParams;
  const tab = params.tab === "shares" ? "shares" : "savings";
  const memberNo = params.memberNo?.slice(0, 50) ?? "";
  const canPost = allows(session.role, permissions.postSavings);
  const canReverse = allows(session.role, permissions.reverseTransactions);

  const [totals, sharePrice] = await Promise.all([
    query<{ savings: string; shares: string; share_value: string }>(
      `SELECT (SELECT coalesce(sum(balance), 0) FROM savings_accounts WHERE organization_id = $1)::text AS savings,
              (SELECT coalesce(sum(shares_count), 0) FROM shares_accounts WHERE organization_id = $1)::text AS shares,
              (SELECT coalesce(sum(share_value), 0) FROM shares_accounts WHERE organization_id = $1)::text AS share_value`,
      [session.organizationId]
    ),
    getSharePrice(session.organizationId),
  ]);

  const { rows } =
    tab === "savings"
      ? await query<Row>(
          `SELECT st.txn_no, st.txn_type, st.amount, st.posted_at, st.description,
                  m.member_no, concat_ws(' ', m.first_name, m.last_name) AS name,
                  EXISTS (SELECT 1 FROM savings_transactions r WHERE r.reversal_of = st.id) AS reversed,
                  NULL::text AS detail
             FROM savings_transactions st
             JOIN members m ON m.id = st.member_id
            WHERE st.organization_id = $1
            ORDER BY st.posted_at DESC LIMIT 50`,
          [session.organizationId]
        )
      : await query<Row>(
          `SELECT st.txn_no, st.txn_type, st.amount, st.posted_at, NULL::text AS description,
                  m.member_no, concat_ws(' ', m.first_name, m.last_name) AS name,
                  EXISTS (SELECT 1 FROM share_transactions r WHERE r.reversal_of = st.id) AS reversed,
                  st.shares_count::text || ' shares' AS detail
             FROM share_transactions st
             JOIN members m ON m.id = st.member_id
            WHERE st.organization_id = $1
            ORDER BY st.posted_at DESC LIMIT 50`,
          [session.organizationId]
        );

  return (
    <>
      <PageHeader
        eyebrow="Financial records"
        title="Savings and shares"
        description="Posted entries are never edited. Mistakes are corrected with a reversal that stays on the record."
        actions={
          <div className="segmented">
            <Link href="/admin/transactions" aria-current={tab === "savings" ? "page" : undefined}>Savings</Link>
            <Link href="/admin/transactions?tab=shares" aria-current={tab === "shares" ? "page" : undefined}>Shares</Link>
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Total savings" value={money(totals.rows[0].savings)} icon={PiggyBank} />
        <StatCard label="Shares issued" value={formatNumber(totals.rows[0].shares)} icon={Landmark} />
        <StatCard label="Share capital" value={money(totals.rows[0].share_value)} icon={Landmark} />
        <StatCard label="Price per share" value={sharePrice ? money(sharePrice) : "Not set"} icon={Tag} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[400px_1fr]">
        {canPost ? (
          tab === "savings" ? <SavingsForm defaultMemberNo={memberNo} /> : <SharesForm
            defaultMemberNo={memberNo}
            sharePrice={sharePrice}
            canSetPrice={allows(session.role, permissions.manageBranding)}
          />
        ) : (
          <Panel title="View only">
            <p className="text-sm text-[var(--muted)]">Your role can review transactions but not post them.</p>
          </Panel>
        )}

        <Panel title="Latest entries" flush>
          {rows.length === 0 ? (
            <EmptyState icon={WalletCards} title="Nothing posted yet" description="New entries will appear here." />
          ) : (
            <TableWrap>
              <table className="data-table stack-table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Member</th>
                    <th>Type</th>
                    <th className="num">Amount</th>
                    <th>Date</th>
                    {canReverse && <th />}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.txn_no}>
                      <td className="cell-lead">
                        <div className="font-semibold">{row.txn_no}</div>
                        <div className="text-xs text-[var(--muted)]">{row.detail || row.description || ""}</div>
                      </td>
                      <td data-label="Member">
                        <div>{row.name}</div>
                        <div className="text-xs text-[var(--muted)]">{row.member_no}</div>
                      </td>
                      <td data-label="Type">
                        <StatusBadge status={row.txn_type} />
                        {row.reversed && <span className="ml-1.5 text-xs text-[var(--muted)]">reversed</span>}
                      </td>
                      <td data-label="Amount" className="num font-semibold">{money(row.amount)}</td>
                      <td data-label="Date">{dateTime(row.posted_at)}</td>
                      {canReverse && (
                        <td data-label="" className="text-right">
                          {row.txn_type !== "REVERSAL" && !row.reversed && (
                            <ReverseButton kind={tab === "savings" ? "SAVINGS" : "SHARES"} txnNo={row.txn_no} />
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
        </Panel>
      </div>
    </>
  );
}
