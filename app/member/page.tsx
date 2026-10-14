import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarDays, HandCoins, Landmark, Megaphone, PiggyBank, TriangleAlert, WalletCards } from "lucide-react";
import { Alert, EmptyState, Panel, StatCard, StatusBadge } from "@/components/ui";
import { query } from "@/lib/db";
import { date, money } from "@/lib/format";
import { requireMemberPage } from "@/lib/guards";

export const metadata: Metadata = { title: "Home" };

export default async function MemberDashboard() {
  const session = await requireMemberPage();
  const memberId = session.memberId;

  const [member, savings, shares, loan, next, recent, notices] = await Promise.all([
    query<{ first_name: string; member_no: string }>("SELECT first_name, member_no FROM members WHERE id = $1", [memberId]),
    query<{ balance: string }>(
      "SELECT coalesce(sum(balance), 0)::text AS balance FROM savings_accounts WHERE member_id = $1 AND status = 'ACTIVE'",
      [memberId]
    ),
    query<{ shares_count: number; share_value: string }>(
      "SELECT shares_count, share_value FROM shares_accounts WHERE member_id = $1",
      [memberId]
    ),
    query<{ v: string }>(
      "SELECT coalesce(sum(outstanding_principal), 0)::text AS v FROM loans WHERE member_id = $1 AND status IN ('DISBURSED', 'ACTIVE')",
      [memberId]
    ),
    query<{ due_date: string; remaining: string; overdue: boolean }>(
      `SELECT ls.due_date, (ls.total_due - ls.principal_paid - ls.interest_paid)::text AS remaining,
              ls.due_date < current_date AS overdue
         FROM loan_schedule ls
         JOIN loans l ON l.id = ls.loan_id
        WHERE l.member_id = $1 AND l.status = 'ACTIVE' AND ls.status <> 'PAID'
        ORDER BY ls.due_date LIMIT 1`,
      [memberId]
    ),
    query<{ txn_no: string; txn_type: string; amount: string; posted_at: string }>(
      "SELECT txn_no, txn_type, amount, posted_at FROM savings_transactions WHERE member_id = $1 ORDER BY posted_at DESC LIMIT 5",
      [memberId]
    ),
    query<{ id: string; title: string; message: string; created_at: string }>(
      `SELECT id, title, message, created_at FROM announcements
        WHERE organization_id = $1 AND active = true AND starts_at <= now()
          AND (expires_at IS NULL OR expires_at > now())
        ORDER BY created_at DESC LIMIT 3`,
      [session.organizationId]
    ),
  ]);

  const upcoming = next.rows[0];

  return (
    <>
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Member {member.rows[0]?.member_no}</p>
        <h1 className="mt-0.5 text-2xl font-bold tracking-tight">Welcome, {member.rows[0]?.first_name ?? "member"}</h1>
      </div>

      {upcoming?.overdue && (
        <div className="mb-5">
          <Alert tone="warning">
            You have a loan payment of <strong>{money(upcoming.remaining)}</strong> that was due on {date(upcoming.due_date)}.
            Please pay at the SACCO office.
          </Alert>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Savings" value={money(savings.rows[0]?.balance)} icon={PiggyBank} />
        <StatCard
          label="Shares"
          value={String(shares.rows[0]?.shares_count ?? 0)}
          hint={money(shares.rows[0]?.share_value)}
          icon={Landmark}
        />
        <StatCard label="Loan balance" value={money(loan.rows[0]?.v)} icon={HandCoins} />
        <StatCard
          label="Next payment"
          value={upcoming ? money(upcoming.remaining) : "—"}
          hint={upcoming ? `Due ${date(upcoming.due_date)}` : "Nothing due"}
          icon={upcoming?.overdue ? TriangleAlert : CalendarDays}
          tone={upcoming?.overdue ? "warn" : undefined}
        />
      </div>

      {notices.rows.length > 0 && (
        <div className="mt-6 space-y-3">
          {notices.rows.map((notice) => (
            <section key={notice.id} className="card flex gap-4 border-[var(--brand-line)] bg-[var(--brand-soft)] p-4 sm:p-5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[var(--brand)]">
                <Megaphone size={18} />
              </span>
              <div className="min-w-0">
                <h2 className="font-semibold">{notice.title}</h2>
                <p className="mt-1 whitespace-pre-line text-sm text-[var(--ink-soft)]">{notice.message}</p>
                <p className="mt-2 text-xs text-[var(--muted)]">{date(notice.created_at)}</p>
              </div>
            </section>
          ))}
        </div>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Panel
          title="Recent savings activity"
          flush
          actions={<Link href="/member/transactions" className="text-sm font-semibold text-[var(--brand)]">Full statement</Link>}
        >
          {recent.rows.length === 0 ? (
            <EmptyState icon={WalletCards} title="No activity yet" description="Deposits and withdrawals will show here once they are posted." />
          ) : (
            <ul className="divide-y divide-[var(--line)]">
              {recent.rows.map((row) => (
                <li key={row.txn_no} className="flex items-center justify-between gap-4 px-4 py-3.5 sm:px-5">
                  <div className="min-w-0">
                    <StatusBadge status={row.txn_type} />
                    <div className="mt-1 text-xs text-[var(--muted)]">{row.txn_no} · {date(row.posted_at)}</div>
                  </div>
                  <div className="shrink-0 text-sm font-semibold tabular-nums">{money(row.amount)}</div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Quick links">
          <div className="grid gap-2.5">
            {[
              ["/member/savings", "Savings accounts"],
              ["/member/loans", "Loans and repayments"],
              ["/member/documents", "Forms and documents"],
              ["/member/complaints", "Contact the SACCO"],
            ].map(([href, text]) => (
              <Link key={href} href={href} className="btn btn-secondary justify-between">
                {text} <ArrowRight size={16} />
              </Link>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}
