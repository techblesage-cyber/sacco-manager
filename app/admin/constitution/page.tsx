import type { Metadata } from "next";
import { ConstitutionForm } from "@/components/constitution-form";
import { PageHeader } from "@/components/ui";
import { query } from "@/lib/db";
import { requireStaffPage } from "@/lib/guards";
import { permissions } from "@/lib/permissions";

export const metadata: Metadata = { title: "Constitution" };

export default async function ConstitutionPage() {
  const session = await requireStaffPage(permissions.manageContent);

  const { rows } = await query<{ title: string; description: string | null; content: string | null }>(
    `SELECT title, description, content FROM sacco_documents
      WHERE organization_id = $1 AND file_type = 'TEXT'
      ORDER BY created_at DESC LIMIT 1`,
    [session.organizationId]
  );

  const current = rows[0];

  return (
    <>
      <PageHeader
        eyebrow="Content"
        title="Constitution"
        description="The text members read under Constitution in their portal. Saving publishes the latest version."
      />
      <ConstitutionForm
        initial={{
          title: current?.title ?? "SACCO constitution",
          description: current?.description ?? "",
          content: current?.content ?? "",
        }}
      />
    </>
  );
}
