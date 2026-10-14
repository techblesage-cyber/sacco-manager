import type { Metadata } from "next";
import Link from "next/link";
import { FolderOpen, Plus } from "lucide-react";
import { DocumentRowActions } from "@/components/document-row-actions";
import { Badge, EmptyState, PageHeader, TableWrap } from "@/components/ui";
import { query } from "@/lib/db";
import { date } from "@/lib/format";
import { requireStaffPage } from "@/lib/guards";
import { permissions } from "@/lib/permissions";

export const metadata: Metadata = { title: "Documents" };

export default async function DocumentsPage() {
  const session = await requireStaffPage(permissions.manageContent);

  const { rows } = await query<{
    id: string;
    title: string;
    description: string | null;
    document_type: string;
    published: boolean;
    created_at: string;
    category: string | null;
  }>(
    `SELECT d.id, d.title, d.description, d.document_type, d.published, d.created_at, c.name AS category
       FROM organization_documents d
       LEFT JOIN document_categories c ON c.id = d.category_id
      WHERE d.organization_id = $1
      ORDER BY d.created_at DESC`,
    [session.organizationId]
  );

  return (
    <>
      <PageHeader
        eyebrow="Content"
        title="Documents and forms"
        description="Files members can download from their portal."
        actions={
          <Link href="/admin/documents/new" className="btn btn-primary">
            <Plus size={17} /> Add document
          </Link>
        }
      />

      <section className="card overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title="No documents yet"
            description="Upload membership forms, loan forms and policies for members."
            action={<Link href="/admin/documents/new" className="btn btn-primary">Add document</Link>}
          />
        ) : (
          <TableWrap>
            <table className="data-table stack-table">
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Category</th>
                  <th>Type</th>
                  <th>Added</th>
                  <th>Visibility</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="cell-lead">
                      <div className="font-semibold">{row.title}</div>
                      {row.description && <div className="line-clamp-1 text-xs text-[var(--muted)]">{row.description}</div>}
                    </td>
                    <td data-label="Category">{row.category ?? "—"}</td>
                    <td data-label="Type">{row.document_type}</td>
                    <td data-label="Added">{date(row.created_at)}</td>
                    <td data-label="Visibility">
                      <Badge tone={row.published ? "green" : "slate"}>{row.published ? "Visible" : "Hidden"}</Badge>
                    </td>
                    <td className="md:text-right"><DocumentRowActions id={row.id} published={row.published} /></td>
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
