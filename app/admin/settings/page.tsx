import type { Metadata } from "next";
import { BrandingForm, SharePriceForm, StaffForm, StaffRowActions } from "@/components/settings-forms";
import { ChangePasswordForm } from "@/components/change-password-form";
import { Badge, PageHeader, Panel, TableWrap } from "@/components/ui";
import { query } from "@/lib/db";
import { date } from "@/lib/format";
import { requireStaffPage } from "@/lib/guards";
import { getLicence } from "@/lib/licence";
import { getBranding, getSharePrice } from "@/lib/org";
import { allows, permissions } from "@/lib/permissions";
import { ROLE_LABELS, type Role } from "@/types/domain";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await requireStaffPage(permissions.manageBranding);
  const [brand, licence, org, sharePrice] = await Promise.all([
    getBranding(session.organizationId),
    getLicence(session.organizationId),
    query<{ code: string }>("SELECT code FROM organizations WHERE id = $1", [session.organizationId]),
    getSharePrice(session.organizationId),
  ]);
  const canManageStaff = allows(session.role, permissions.manageStaff);

  const staff = canManageStaff
    ? await query<{ id: string; username: string; role: Role; active: boolean; last_login_at: string | null }>(
        `SELECT id, username, role, active, last_login_at
           FROM users WHERE organization_id = $1 AND role <> 'MEMBER' ORDER BY created_at`,
        [session.organizationId]
      )
    : null;

  return (
    <>
      <PageHeader eyebrow="Administration" title="Settings" description="Branding, staff access and your own password." />

      <div className="mb-6 grid gap-6 xl:grid-cols-2">
        <Panel title="Your SACCO code">
          <div className="text-3xl font-bold tracking-[0.25em]">{org.rows[0]?.code}</div>
          <p className="mt-3 text-sm text-[var(--muted)]">
            Members and staff enter this code on the sign-in page, together with their own number or username.
          </p>
        </Panel>

        <Panel title="Licence">
          <div className="text-lg font-bold">
            {licence.state === "unlimited"
              ? "No expiry date"
              : licence.expiresAt
                ? `Valid until ${date(licence.expiresAt)}`
                : "—"}
          </div>
          <p className="mt-3 text-sm text-[var(--muted)]">
            Thirty days after a licence runs out, records become read-only: you can still view and export everything,
            but new entries are blocked until it is renewed. Contact your software provider to renew.
          </p>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Branding">
          <BrandingForm displayName={brand.name} color={brand.color} />
        </Panel>

        <Panel title="Share price">
          <SharePriceForm price={sharePrice} />
        </Panel>

        <Panel title="Change your password">
          <ChangePasswordForm />
        </Panel>
      </div>

      {staff && (
        <div className="mt-6 grid gap-6 xl:grid-cols-[400px_1fr]">
          <Panel title="Add staff">
            <StaffForm />
          </Panel>

          <Panel title="Staff accounts" flush>
            <TableWrap>
              <table className="data-table stack-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Role</th>
                    <th>Last sign-in</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {staff.rows.map((row) => (
                    <tr key={row.id}>
                      <td className="cell-lead font-semibold">{row.username}</td>
                      <td data-label="Role">{ROLE_LABELS[row.role]}</td>
                      <td data-label="Last sign-in">{row.last_login_at ? date(row.last_login_at) : "Never"}</td>
                      <td data-label="Status"><Badge tone={row.active ? "green" : "slate"}>{row.active ? "Active" : "Inactive"}</Badge></td>
                      <td className="md:text-right">
                        {row.id !== session.id && <StaffRowActions id={row.id} active={row.active} />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          </Panel>
        </div>
      )}
    </>
  );
}
