import { Shell } from "@/components/shell";
import { requireMemberPage } from "@/lib/guards";
import { getBranding } from "@/lib/org";
import { query } from "@/lib/db";
import { ForcePasswordChange } from "@/components/change-password-form";

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const session = await requireMemberPage();
  const brand = await getBranding(session.organizationId);

  if (session.mustChangePassword) {
    return <ForcePasswordChange color={brand.color} />;
  }

  const { rows } = await query<{ name: string }>(
    `SELECT concat_ws(' ', first_name, last_name) AS name FROM members WHERE id = $1`,
    [session.memberId]
  );

  return (
    <Shell
      variant="member"
      role="MEMBER"
      userName={rows[0]?.name || session.username}
      orgName={brand.name}
      color={brand.color}
    >
      {children}
    </Shell>
  );
}
