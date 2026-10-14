import type { Metadata } from "next";
import { ScrollText } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/ui";
import { query } from "@/lib/db";
import { date } from "@/lib/format";
import { requireMemberPage } from "@/lib/guards";
import { sanitizeHtml } from "@/lib/sanitize";

export const metadata: Metadata = { title: "Constitution" };

export default async function ConstitutionPage() {
  const session = await requireMemberPage();

  const { rows } = await query<{ title: string; description: string | null; content: string | null; updated_at: string }>(
    `SELECT title, description, content, updated_at FROM sacco_documents
      WHERE organization_id = $1 AND file_type = 'TEXT' AND published = true
      ORDER BY created_at DESC LIMIT 1`,
    [session.organizationId]
  );

  const doc = rows[0];

  if (!doc?.content) {
    return (
      <>
        <PageHeader eyebrow="SACCO" title="Constitution" />
        <div className="card">
          <EmptyState icon={ScrollText} title="Not published yet" description="The SACCO has not published its constitution." />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="SACCO"
        title={doc.title}
        description={doc.description ?? `Last updated ${date(doc.updated_at)}`}
      />
      <article className="card max-w-4xl p-5 sm:p-8">
        <div className="doc-body" dangerouslySetInnerHTML={{ __html: sanitizeHtml(doc.content) }} />
      </article>
    </>
  );
}
