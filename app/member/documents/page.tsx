import type { Metadata } from "next";
import { Download, FolderOpen } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/ui";
import { query } from "@/lib/db";
import { date } from "@/lib/format";
import { requireMemberPage } from "@/lib/guards";

export const metadata: Metadata = { title: "Documents" };

export default async function MemberDocumentsPage() {
  const session = await requireMemberPage();

  const { rows } = await query<{
    id: string;
    title: string;
    description: string | null;
    document_type: string;
    published_at: string | null;
    category: string | null;
  }>(
    `SELECT d.id, d.title, d.description, d.document_type, d.published_at, c.name AS category
       FROM organization_documents d
       LEFT JOIN document_categories c ON c.id = d.category_id
      WHERE d.organization_id = $1 AND d.published = true AND d.file_url IS NOT NULL
      ORDER BY c.name NULLS LAST, d.title`,
    [session.organizationId]
  );

  const groups = new Map<string, typeof rows>();
  for (const row of rows) {
    const key = row.category ?? "Other";
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }

  return (
    <>
      <PageHeader eyebrow="SACCO" title="Forms and documents" description="Download the forms and policies you need." />

      {rows.length === 0 ? (
        <div className="card">
          <EmptyState icon={FolderOpen} title="No documents yet" description="Forms and policies published by the SACCO will appear here." />
        </div>
      ) : (
        <div className="space-y-6">
          {[...groups.entries()].map(([category, docs]) => (
            <section key={category}>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">{category}</h2>
              <div className="card divide-y divide-[var(--line)]">
                {docs.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between gap-4 p-4 sm:px-5">
                    <div className="min-w-0">
                      <div className="font-semibold">{doc.title}</div>
                      <div className="mt-0.5 line-clamp-2 text-sm text-[var(--muted)]">
                        {doc.description || `${doc.document_type} file`}
                        {doc.published_at ? ` · ${date(doc.published_at)}` : ""}
                      </div>
                    </div>
                    <a href={`/api/documents/${doc.id}`} className="btn btn-secondary btn-sm shrink-0" aria-label={`Download ${doc.title}`}>
                      <Download size={16} /> <span className="hidden sm:inline">Download</span>
                    </a>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
