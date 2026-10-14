import type { Metadata } from "next";
import Link from "next/link";
import { MessageSquareWarning } from "lucide-react";
import { ComplaintResponseForm } from "@/components/complaint-response-form";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { query } from "@/lib/db";
import { dateTime, label } from "@/lib/format";
import { requireStaffPage } from "@/lib/guards";
import { permissions } from "@/lib/permissions";

export const metadata: Metadata = { title: "Complaints" };

const FILTERS = [
  { key: "open", label: "Open", statuses: ["OPEN", "IN_REVIEW"] },
  { key: "closed", label: "Closed", statuses: ["RESOLVED", "REJECTED"] },
  { key: "all", label: "All", statuses: [] as string[] },
];

export default async function AdminComplaints({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const session = await requireStaffPage(permissions.handleComplaints);
  const params = await searchParams;
  const active = FILTERS.find((f) => f.key === params.filter) ?? FILTERS[0];

  const { rows } = await query<{
    id: string;
    reference_no: string;
    subject: string;
    description: string;
    category: string;
    status: string;
    response: string | null;
    created_at: string;
    member_name: string;
    member_no: string;
  }>(
    `SELECT c.id, c.reference_no, c.subject, c.description, c.category, c.status, c.response, c.created_at,
            concat_ws(' ', m.first_name, m.last_name) AS member_name, m.member_no
       FROM complaints c
       JOIN members m ON m.id = c.member_id
      WHERE c.organization_id = $1
        AND (cardinality($2::text[]) = 0 OR c.status = ANY($2::text[]))
      ORDER BY c.created_at DESC
      LIMIT 100`,
    [session.organizationId, active.statuses]
  );

  return (
    <>
      <PageHeader
        eyebrow="Member support"
        title="Complaints"
        description="Review, respond to and close complaints raised by members."
        actions={
          <div className="segmented">
            {FILTERS.map((filter) => (
              <Link
                key={filter.key}
                href={filter.key === "open" ? "/admin/complaints" : `/admin/complaints?filter=${filter.key}`}
                aria-current={active.key === filter.key ? "page" : undefined}
              >
                {filter.label}
              </Link>
            ))}
          </div>
        }
      />

      {rows.length === 0 ? (
        <div className="card">
          <EmptyState icon={MessageSquareWarning} title="No complaints here" description="Complaints matching this view will appear in this list." />
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => (
            <section className="card p-4 sm:p-6" key={row.id}>
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                <div className="min-w-0">
                  <div className="text-xs text-[var(--muted)]">
                    {row.reference_no} · {dateTime(row.created_at)}
                  </div>
                  <h2 className="mt-1 font-semibold">{row.subject}</h2>
                  <div className="mt-1 text-sm text-[var(--muted)]">
                    {row.member_name} ({row.member_no}) · {label(row.category)}
                  </div>
                </div>
                <StatusBadge status={row.status} />
              </div>
              <p className="mt-4 whitespace-pre-line text-sm text-[var(--ink-soft)]">{row.description}</p>
              <ComplaintResponseForm id={row.id} status={row.status} response={row.response} />
            </section>
          ))}
        </div>
      )}
    </>
  );
}
