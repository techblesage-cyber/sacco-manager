import type { Metadata } from "next";
import { MemberForm } from "@/components/member-form";
import { PageHeader } from "@/components/ui";
import { query } from "@/lib/db";
import { requireStaffPage } from "@/lib/guards";
import { getBranding } from "@/lib/org";
import { permissions } from "@/lib/permissions";

export const metadata: Metadata = { title: "Register member" };

export default async function NewMemberPage() {
  const session = await requireStaffPage(permissions.registerMembers);
  const [brand, org] = await Promise.all([
    getBranding(session.organizationId),
    query<{ code: string }>("SELECT code FROM organizations WHERE id = $1", [session.organizationId]),
  ]);

  return (
    <>
      <PageHeader
        back={{ href: "/admin/members", label: "Members" }}
        title="Register a member"
        description="This creates the member, their savings account, a share account and a sign-in with a temporary PIN."
      />
      <MemberForm saccoName={brand.name} saccoCode={org.rows[0]?.code ?? ""} />
    </>
  );
}
