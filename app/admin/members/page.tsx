import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Search, Users } from "lucide-react";
import { EmptyState, PageHeader, StatusBadge, TableWrap } from "@/components/ui";
import { query } from "@/lib/db";
import { date, money } from "@/lib/format";
import { requireStaffPage } from "@/lib/guards";
import { allows, permissions } from "@/lib/permissions";

export const metadata: Metadata = { title: "Members" };

type Row = {
  id: string;
  member_no: string;
  name: string;
  phone: string | null;
  status: string;
  join_date: string;
  savings: string;
  shares: number;
};

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const session = await requireStaffPage();
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const status = params.status ?? "";

  const { rows } = await query<Row>(
    `SELECT m.id, m.member_no,
            concat_ws(' ', m.first_name, m.middle_name, m.last_name) AS name,
            m.phone, m.status, m.join_date,
            coalesce(sa.balance, 0) AS savings,
            coalesce((SELECT shares_count FROM shares_accounts WHERE member_id = m.id), 0) AS shares
       FROM members m
       LEFT JOIN LATERAL (
         SELECT sum(balance) AS balance FROM savings_accounts
          WHERE member_id = m.id AND status = 'ACTIVE'
       ) sa ON true
      WHERE m.organization_id = $1
        AND ($2 = '' OR m.member_no ILIKE '%' || $2 || '%'
             OR concat_ws(' ', m.first_name, m.middle_name, m.last_name) ILIKE '%' || $2 || '%'
             OR coalesce(m.phone, '') ILIKE '%' || $2 || '%')
        AND ($3 = '' OR m.status = $3)
      ORDER BY m.created_at DESC
      LIMIT 100`,
    [session.organizationId, q, status]
  );

  return (
    <>
      <PageHeader
        eyebrow="Records"
        title="Members"
        description="Search and manage registered SACCO members."
        actions={
          allows(session.role, permissions.registerMembers) && (
            <Link href="/admin/members/new" className="btn btn-primary">
              <Plus size={17} /> Register member
            </Link>
          )
        }
      />

      <section className="card overflow-hidden">
        <form className="flex flex-col gap-2 border-b border-[var(--line)] p-3 sm:flex-row sm:p-4">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-3.5 text-slate-400" size={17} />
            <input
              name="q"
              defaultValue={q}
              className="field pl-9"
              placeholder="Search by name, member number or phone"
              type="search"
            />
          </div>
          <select name="status" defaultValue={status} className="field sm:w-44" aria-label="Status">
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="EXITED">Exited</option>
          </select>
          <button className="btn btn-secondary">Search</button>
        </form>

        {rows.length === 0 ? (
          <EmptyState
            icon={Users}
            title={q || status ? "No members match your search" : "No members yet"}
            description={q || status ? "Try a different name, number or status." : "Register the first member to get started."}
          />
        ) : (
          <TableWrap>
            <table className="data-table stack-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Phone</th>
                  <th className="num">Savings</th>
                  <th className="num">Shares</th>
                  <th>Status</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="cell-lead">
                      <Link href={`/admin/members/${row.id}`} className="font-semibold hover:text-[var(--brand)] hover:underline">
                        {row.name}
                      </Link>
                      <div className="text-xs text-[var(--muted)]">{row.member_no}</div>
                    </td>
                    <td data-label="Phone">{row.phone || "—"}</td>
                    <td data-label="Savings" className="num">{money(row.savings)}</td>
                    <td data-label="Shares" className="num">{row.shares}</td>
                    <td data-label="Status"><StatusBadge status={row.status} /></td>
                    <td data-label="Joined">{date(row.join_date)}</td>
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
