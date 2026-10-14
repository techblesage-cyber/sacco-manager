import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { EmptyState, PageHeader, TableWrap } from "@/components/ui";
import { query } from "@/lib/db";
import { dateTime, label } from "@/lib/format";
import { requireStaffPage } from "@/lib/guards";
import { permissions } from "@/lib/permissions";

export const metadata: Metadata = { title: "Audit log" };

function describe(metadata: Record<string, unknown> | null) {
  if (!metadata) return "";
  return Object.entries(metadata)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .map(([key, value]) => `${label(key.replace(/([A-Z])/g, "_$1"))}: ${String(value)}`)
    .join(" · ");
}

export default async function AuditLogPage() {
  const session = await requireStaffPage(permissions.viewAudit);

  const { rows } = await query<{
    id: string;
    event_type: string;
    entity_type: string | null;
    metadata: Record<string, unknown> | null;
    created_at: string;
    actor: string | null;
  }>(
    `SELECT a.id, a.event_type, a.entity_type, a.metadata, a.created_at, u.username AS actor
       FROM audit_events a
       LEFT JOIN users u ON u.id = a.actor_user_id
      WHERE a.organization_id = $1
      ORDER BY a.created_at DESC
      LIMIT 200`,
    [session.organizationId]
  );

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Audit log"
        description="A permanent record of important actions. The most recent 200 events are shown."
      />

      <section className="card overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState icon={ShieldCheck} title="No activity recorded yet" description="Actions such as posting transactions or approving loans will appear here." />
        ) : (
          <TableWrap>
            <table className="data-table stack-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Action</th>
                  <th>By</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td data-label="When" className="whitespace-nowrap">{dateTime(row.created_at)}</td>
                    <td data-label="Action" className="font-medium">{label(row.event_type)}</td>
                    <td data-label="By">{row.actor ?? "System"}</td>
                    <td data-label="Details" className="text-[var(--muted)]">{describe(row.metadata) || "—"}</td>
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
