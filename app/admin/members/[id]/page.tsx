import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HandCoins, PiggyBank, Landmark, Plus, WalletCards } from "lucide-react";
import { MemberActions } from "@/components/member-actions";
import { DetailList, EmptyState, PageHeader, Panel, StatCard, StatusBadge, TableWrap } from "@/components/ui";
import { query } from "@/lib/db";
import { date, money } from "@/lib/format";
import { requireStaffPage } from "@/lib/guards";
import { getBranding } from "@/lib/org";
import { allows, permissions } from "@/lib/permissions";

export const metadata: Metadata = { title: "Member record" };

export default async function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireStaffPage();
  const { id } = await params;

  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const memberResult = await query<{
    id: string;
    member_no: string;
    name: string;
    phone: string | null;
    email: string | null;
    join_date: string;
    status: string;
    has_login: boolean;
  }>(
    `SELECT m.id, m.member_no,
            concat_ws(' ', m.first_name, m.middle_name, m.last_name) AS name,
            m.phone, m.email, m.join_date, m.status,
            EXISTS (SELECT 1 FROM users u WHERE u.member_id = m.id) AS has_login
       FROM members m
      WHERE m.id = $1 AND m.organization_id = $2`,
    [id, session.organizationId]
  );

  const member = memberResult.rows[0];
  if (!member) notFound();

  const [brand, org, savings, shares, loans, transactions] = await Promise.all([
    getBranding(session.organizationId),
    query<{ code: string }>("SELECT code FROM organizations WHERE id = $1", [session.organizationId]),
    query<{ balance: string }>(
      `SELECT coalesce(sum(balance), 0)::text AS balance FROM savings_accounts WHERE member_id = $1 AND status = 'ACTIVE'`,
      [id]
    ),
    query<{ shares_count: number; share_value: string }>(
      `SELECT shares_count, share_value FROM shares_accounts WHERE member_id = $1`,
      [id]
    ),
    query<{ id: string; loan_no: string; product_name: string; principal: string; outstanding_principal: string; status: string }>(
      `SELECT id, loan_no, product_name, principal, outstanding_principal, status
         FROM loans WHERE member_id = $1 ORDER BY created_at DESC`,
      [id]
    ),
    query<{ txn_no: string; txn_type: string; amount: string; posted_at: string }>(
      `SELECT txn_no, txn_type, amount, posted_at FROM savings_transactions
        WHERE member_id = $1 ORDER BY posted_at DESC LIMIT 8`,
      [id]
    ),
  ]);

  const canManage = allows(session.role, permissions.manageMembers);
  const canPost = allows(session.role, permissions.postSavings);
  const outstanding = loans.rows
    .filter((loan) => loan.status === "ACTIVE" || loan.status === "DISBURSED")
    .reduce((sum, loan) => sum + Number(loan.outstanding_principal), 0);

  return (
    <>
      <PageHeader
        back={{ href: "/admin/members", label: "Members" }}
        eyebrow={member.member_no}
        title={member.name}
        description={`Member since ${date(member.join_date)}`}
        actions={
          <>
            <StatusBadge status={member.status} />
            {canPost && (
              <Link href={`/admin/transactions?memberNo=${encodeURIComponent(member.member_no)}`} className="btn btn-secondary">
                <Plus size={16} /> Post transaction
              </Link>
            )}
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard label="Savings balance" value={money(savings.rows[0]?.balance)} icon={PiggyBank} />
        <StatCard
          label="Shares"
          value={String(shares.rows[0]?.shares_count ?? 0)}
          hint={money(shares.rows[0]?.share_value)}
          icon={Landmark}
        />
        <StatCard label="Loan balance" value={money(outstanding)} icon={HandCoins} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Panel title="Loans" flush>
            {loans.rows.length === 0 ? (
              <EmptyState icon={HandCoins} title="No loans" description="This member has no loan applications." />
            ) : (
              <TableWrap>
                <table className="data-table stack-table">
                  <thead>
                    <tr>
                      <th>Loan</th>
                      <th className="num">Principal</th>
                      <th className="num">Outstanding</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loans.rows.map((loan) => (
                      <tr key={loan.id}>
                        <td className="cell-lead">
                          <Link href={`/admin/loans/${loan.id}`} className="font-semibold hover:text-[var(--brand)] hover:underline">
                            {loan.loan_no}
                          </Link>
                          <div className="text-xs text-[var(--muted)]">{loan.product_name}</div>
                        </td>
                        <td data-label="Principal" className="num">{money(loan.principal)}</td>
                        <td data-label="Outstanding" className="num">{money(loan.outstanding_principal)}</td>
                        <td data-label="Status"><StatusBadge status={loan.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            )}
          </Panel>

          <Panel title="Recent savings activity" flush>
            {transactions.rows.length === 0 ? (
              <EmptyState icon={WalletCards} title="No transactions" description="Nothing has been posted to this member's savings." />
            ) : (
              <TableWrap>
                <table className="data-table stack-table">
                  <thead>
                    <tr>
                      <th>Transaction</th>
                      <th>Type</th>
                      <th className="num">Amount</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.rows.map((tx) => (
                      <tr key={tx.txn_no}>
                        <td className="cell-lead font-medium">{tx.txn_no}</td>
                        <td data-label="Type"><StatusBadge status={tx.txn_type} /></td>
                        <td data-label="Amount" className="num font-semibold">{money(tx.amount)}</td>
                        <td data-label="Date">{date(tx.posted_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Details">
            <DetailList
              items={[
                ["Member number", member.member_no],
                ["Phone", member.phone],
                ["Email", member.email],
                ["Joined", date(member.join_date)],
              ]}
            />
          </Panel>

          {canManage && (
            <Panel title="Manage member">
              <MemberActions
                memberId={member.id}
                status={member.status}
                phone={member.phone ?? ""}
                email={member.email ?? ""}
                hasLogin={member.has_login}
                memberNo={member.member_no}
                memberName={member.name}
                saccoName={brand.name}
                saccoCode={org.rows[0]?.code ?? ""}
              />
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
