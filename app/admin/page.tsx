import type { Metadata } from "next";
import Link from "next/link";
import { HandCoins, Landmark, MessageSquareWarning, PiggyBank, TriangleAlert, UserPlus, Users, WalletCards } from "lucide-react";
import { EmptyState, PageHeader, Panel, StatCard, StatusBadge } from "@/components/ui";
import { query } from "@/lib/db";
import { dateTime, formatNumber, money } from "@/lib/format";
import { requireStaffPage } from "@/lib/guards";
import { allows, permissions } from "@/lib/permissions";

export const metadata: Metadata = { title: "Dashboard" };

export default async function AdminDashboard() {
  const session = await requireStaffPage();
  const org = session.organizationId;

  const [members, savings, shares, loans, complaints, arrears, recent] = await Promise.all([
    query<{ n: string }>("SELECT count(*)::text AS n FROM members WHERE organization_id = $1 AND status = 'ACTIVE'", [org]),
    query<{ v: string }>("SELECT coalesce(sum(balance), 0)::text AS v FROM savings_accounts WHERE organization_id = $1 AND status = 'ACTIVE'", [org]),
    query<{ n: string; v: string }>(
      `SELECT coalesce(sum(shares_count), 0)::text AS n, coalesce(sum(share_value), 0)::text AS v
         FROM shares_accounts WHERE organization_id = $1`,
      [org]
    ),
    query<{ n: string; v: string }>(
      `SELECT count(*)::text AS n, coalesce(sum(outstanding_principal), 0)::text AS v
         FROM loans WHERE organization_id = $1 AND status IN ('DISBURSED', 'ACTIVE')`,
      [org]
    ),
    query<{ n: string }>("SELECT count(*)::text AS n FROM complaints WHERE organization_id = $1 AND status IN ('OPEN', 'IN_REVIEW')", [org]),
    query<{ loans: string; v: string }>(
      `SELECT count(DISTINCT ls.loan_id)::text AS loans,
              coalesce(sum(ls.total_due - ls.principal_paid - ls.interest_paid), 0)::text AS v
         FROM loan_schedule ls
         JOIN loans l ON l.id = ls.loan_id
        WHERE l.organization_id = $1 AND l.status = 'ACTIVE'
          AND ls.status <> 'PAID' AND ls.due_date < current_date`,
      [org]
    ),
    query<{ txn_no: string; txn_type: string; amount: string; posted_at: string; name: string }>(
      `SELECT st.txn_no, st.txn_type, st.amount, st.posted_at, concat_ws(' ', m.first_name, m.last_name) AS name
         FROM savings_transactions st
         JOIN members m ON m.id = st.member_id
        WHERE st.organization_id = $1
        ORDER BY st.posted_at DESC LIMIT 6`,
      [org]
    ),
  ]);

  const overdueLoans = Number(arrears.rows[0].loans);

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="Current position of the SACCO."
        actions={
          allows(session.role, permissions.registerMembers) && (
            <Link href="/admin/members/new" className="btn btn-primary">
              <UserPlus size={17} /> Register member
            </Link>
          )
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
        <StatCard label="Active members" value={members.rows[0].n} icon={Users} />
        <StatCard label="Total savings" value={money(savings.rows[0].v)} icon={PiggyBank} />
        <StatCard label="Shares issued" value={formatNumber(shares.rows[0].n)} hint="Across all members" icon={Landmark} />
        <StatCard label="Share capital" value={money(shares.rows[0].v)} icon={Landmark} />
        <StatCard label="Loans outstanding" value={money(loans.rows[0].v)} hint={`${loans.rows[0].n} active`} icon={HandCoins} />
        <StatCard label="Open complaints" value={complaints.rows[0].n} icon={MessageSquareWarning} />
      </div>

      {overdueLoans > 0 && (
        <Link
          href="/admin/loans?filter=active"
          className="card mt-4 flex items-center gap-4 border-amber-200 bg-amber-50 p-4 sm:p-5"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
            <TriangleAlert size={20} />
          </span>
          <div className="min-w-0">
            <div className="font-semibold text-amber-900">
              {overdueLoans} loan{overdueLoans === 1 ? "" : "s"} in arrears
            </div>
            <div className="text-sm text-amber-800">{money(arrears.rows[0].v)} is overdue. Open the loans list to follow up.</div>
          </div>
        </Link>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Panel title="Latest savings activity" flush actions={<Link href="/admin/transactions" className="text-sm font-semibold text-[var(--brand)]">View all</Link>}>
          {recent.rows.length === 0 ? (
            <EmptyState icon={WalletCards} title="Nothing posted yet" description="Savings transactions will appear here once they are recorded." />
          ) : (
            <ul className="divide-y divide-[var(--line)]">
              {recent.rows.map((row) => (
                <li key={row.txn_no} className="flex items-center justify-between gap-4 px-4 py-3.5 sm:px-5">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{row.name}</div>
                    <div className="mt-0.5 text-xs text-[var(--muted)]">{row.txn_no} · {dateTime(row.posted_at)}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-semibold tabular-nums">{money(row.amount)}</div>
                    <StatusBadge status={row.txn_type} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Quick actions">
          <div className="grid gap-2.5">
            <Link href="/admin/transactions" className="btn btn-secondary justify-start">
              <WalletCards size={17} /> Post a transaction
            </Link>
            <Link href="/admin/loans" className="btn btn-secondary justify-start">
              <HandCoins size={17} /> Review loans
            </Link>
            <Link href="/admin/members" className="btn btn-secondary justify-start">
              <Users size={17} /> Find a member
            </Link>
          </div>
        </Panel>
      </div>
    </>
  );
}
