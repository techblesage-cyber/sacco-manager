import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { authorize, fail } from "@/lib/api";
import { query } from "@/lib/db";
import { audit } from "@/lib/audit";
import { permissions } from "@/lib/permissions";
import { storageConfigured, uploadToR2 } from "@/lib/r2";

const MAX_BYTES = 10 * 1024 * 1024;
const TYPES: Record<string, { type: "PDF" | "DOC" | "DOCX"; mime: string }> = {
  pdf: { type: "PDF", mime: "application/pdf" },
  doc: { type: "DOC", mime: "application/msword" },
  docx: {
    type: "DOCX",
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  },
};

export async function POST(req: Request) {
  const auth = await authorize(permissions.manageContent, "upload documents");
  if (auth.error) return auth.error;
  const user = auth.user;

  if (!storageConfigured()) {
    return fail("Document storage has not been set up yet. Add the R2 settings to the environment.", 503);
  }

  const form = await req.formData().catch(() => null);
  if (!form) return fail("The upload could not be read.");

  const title = String(form.get("title") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const categoryId = String(form.get("categoryId") ?? "").trim();
  const published = form.get("published") === "true";
  const file = form.get("file");

  if (title.length < 2 || title.length > 200) return fail("Enter a document title.");
  if (!(file instanceof File) || file.size === 0) return fail("Choose a file to upload.");
  if (file.size > MAX_BYTES) return fail("The file is larger than 10 MB.");

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const kind = TYPES[extension];
  if (!kind) return fail("Only PDF, DOC and DOCX files can be uploaded.");

  let category: string | null = null;
  if (categoryId) {
    const found = await query<{ id: string }>(
      "SELECT id FROM document_categories WHERE id = $1 AND organization_id = $2",
      [categoryId, user.organizationId]
    );
    if (!found.rowCount) return fail("Choose a valid category.");
    category = found.rows[0].id;
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-80);
  const key = `${user.organizationId}/documents/${crypto.randomUUID()}-${safeName}`;

  try {
    await uploadToR2(key, Buffer.from(await file.arrayBuffer()), kind.mime);
  } catch (e) {
    console.error("DOCUMENT_UPLOAD_ERROR", e);
    return fail("The file could not be stored. Try again in a moment.", 502);
  }

  const created = await query<{ id: string }>(
    `INSERT INTO organization_documents
       (organization_id, category_id, title, description, document_type, file_name, file_url,
        published, published_at, uploaded_by)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,CASE WHEN $8 THEN now() END,$9) RETURNING id`,
    [user.organizationId, category, title, description || null, kind.type, file.name, key, published, user.id]
  );

  await audit(user.organizationId, user.id, "DOCUMENT_UPLOADED", "DOCUMENT", created.rows[0].id, { title });
  return NextResponse.json({ ok: true, id: created.rows[0].id });
}
