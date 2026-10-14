import type { Metadata } from "next";
import { ComplaintForm } from "@/components/complaint-form";
import { PageHeader, StatusBadge } from "@/components/ui";
import { query } from "@/lib/db";
import { dateTime, label } from "@/lib/format";
import { requireMemberPage } from "@/lib/guards";

export const metadata: Metadata = { title: "Support" };

export default async function MemberComplaintsPage() {
  const session = await requireMemberPage();

  const { rows } = await query<{
    reference_no: string;
    category: string;
    subject: string;
    description: string;
    status: string;
    response: string | null;
    created_at: string;
  }>(
    `SELECT reference_no, category, subject, description, status, response, created_at
       FROM complaints WHERE member_id = $1 ORDER BY created_at DESC`,
    [session.memberId]
  );

  return (
    <>
      <PageHeader eyebrow="Support" title="Contact the SACCO" description="Report a problem and see the reply from staff." />

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <ComplaintForm />

        <section className="space-y-4">
          {rows.length === 0 ? (
            <div className="card p-8 text-center text-sm text-[var(--muted)]">You have not sent any messages yet.</div>
          ) : (
            rows.map((row) => (
              <article key={row.reference_no} className="card p-4 sm:p-5">
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                  <div className="min-w-0">
                    <div className="text-xs text-[var(--muted)]">
                      {row.reference_no} · {dateTime(row.created_at)} · {label(row.category)}
                    </div>
                    <h2 className="mt-1 font-semibold">{row.subject}</h2>
                  </div>
                  <StatusBadge status={row.status} />
                </div>
                <p className="mt-3 whitespace-pre-line text-sm text-[var(--ink-soft)]">{row.description}</p>
                {row.response && (
                  <div className="mt-4 rounded-lg border border-[var(--brand-line)] bg-[var(--brand-soft)] p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Reply from the SACCO</div>
                    <p className="mt-1 whitespace-pre-line text-sm">{row.response}</p>
                  </div>
                )}
              </article>
            ))
          )}
        </section>
      </div>
    </>
  );
}
