import type { Metadata } from "next";
import { DocumentUploadForm } from "@/components/document-upload-form";
import { PageHeader } from "@/components/ui";
import { query } from "@/lib/db";
import { requireStaffPage } from "@/lib/guards";
import { permissions } from "@/lib/permissions";

export const metadata: Metadata = { title: "Add document" };

export default async function NewDocumentPage() {
  const session = await requireStaffPage(permissions.manageContent);
  const { rows } = await query<{ id: string; name: string }>(
    "SELECT id, name FROM document_categories WHERE organization_id = $1 AND active = true ORDER BY name",
    [session.organizationId]
  );

  return (
    <>
      <PageHeader
        back={{ href: "/admin/documents", label: "Documents" }}
        title="Add a document"
        description="Upload a form, policy or notice for members to download."
      />
      <DocumentUploadForm categories={rows} />
    </>
  );
}
