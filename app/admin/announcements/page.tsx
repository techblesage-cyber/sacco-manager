import type { Metadata } from "next";
import { Megaphone } from "lucide-react";
import { AnnouncementForm, AnnouncementRowActions } from "@/components/announcement-form";
import { Badge, EmptyState, PageHeader, Panel } from "@/components/ui";
import { query } from "@/lib/db";
import { date } from "@/lib/format";
import { requireStaffPage } from "@/lib/guards";
import { permissions } from "@/lib/permissions";

export const metadata: Metadata = { title: "Announcements" };

export default async function AnnouncementsPage() {
  const session = await requireStaffPage(permissions.manageContent);

  const { rows } = await query<{
    id: string;
    title: string;
    message: string;
    active: boolean;
    created_at: string;
    expires_at: string | null;
    expired: boolean;
  }>(
    `SELECT id, title, message, active, created_at, expires_at,
            (expires_at IS NOT NULL AND expires_at < now()) AS expired
       FROM announcements WHERE organization_id = $1
      ORDER BY created_at DESC LIMIT 50`,
    [session.organizationId]
  );

  return (
    <>
      <PageHeader
        eyebrow="Content"
        title="Announcements"
        description="Notices shown on every member's home screen."
      />

      <div className="grid gap-6 xl:grid-cols-[400px_1fr]">
        <AnnouncementForm />

        <Panel title="Posted announcements" flush>
          {rows.length === 0 ? (
            <EmptyState icon={Megaphone} title="No announcements yet" description="Members will see new announcements on their home screen." />
          ) : (
            <ul className="divide-y divide-[var(--line)]">
              {rows.map((row) => (
                <li key={row.id} className="p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold">{row.title}</h3>
                      <p className="mt-0.5 text-xs text-[var(--muted)]">
                        Posted {date(row.created_at)}
                        {row.expires_at ? ` · until ${date(row.expires_at)}` : ""}
                      </p>
                    </div>
                    <Badge tone={row.expired ? "slate" : row.active ? "green" : "amber"}>
                      {row.expired ? "Expired" : row.active ? "Visible" : "Hidden"}
                    </Badge>
                  </div>
                  <p className="mt-3 whitespace-pre-line text-sm text-[var(--ink-soft)]">{row.message}</p>
                  <div className="mt-4"><AnnouncementRowActions id={row.id} active={row.active} /></div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
