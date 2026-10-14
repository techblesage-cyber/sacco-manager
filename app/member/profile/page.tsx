import type { Metadata } from "next";
import { ChangePasswordForm } from "@/components/change-password-form";
import { DetailList, PageHeader, Panel, StatusBadge } from "@/components/ui";
import { query } from "@/lib/db";
import { date } from "@/lib/format";
import { requireMemberPage } from "@/lib/guards";

export const metadata: Metadata = { title: "Profile and security" };

export default async function ProfilePage() {
  const session = await requireMemberPage();

  const { rows } = await query<{
    member_no: string;
    name: string;
    phone: string | null;
    email: string | null;
    join_date: string;
    status: string;
  }>(
    `SELECT member_no, concat_ws(' ', first_name, middle_name, last_name) AS name, phone, email, join_date, status
       FROM members WHERE id = $1`,
    [session.memberId]
  );
  const member = rows[0];

  return (
    <>
      <PageHeader eyebrow="Account" title="Profile and security" />

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Your details">
          <DetailList
            items={[
              ["Member number", member?.member_no],
              ["Name", member?.name],
              ["Phone", member?.phone],
              ["Email", member?.email],
              ["Joined", date(member?.join_date)],
              ["Status", member ? <StatusBadge key="s" status={member.status} /> : null],
            ]}
          />
          <p className="mt-6 rounded-lg bg-slate-50 p-3 text-sm text-[var(--muted)]">
            To correct your name or contact details, please visit the SACCO office.
          </p>
        </Panel>

        <Panel title="Change your PIN or password">
          <ChangePasswordForm />
        </Panel>
      </div>
    </>
  );
}
