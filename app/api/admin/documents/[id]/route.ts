import { NextResponse } from "next/server";
import { z } from "zod";
import { authorize, fail, readJson } from "@/lib/api";
import { query } from "@/lib/db";
import { audit } from "@/lib/audit";
import { permissions } from "@/lib/permissions";
import { deleteFromR2, storageConfigured } from "@/lib/r2";

const body = z.object({ published: z.boolean() });

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await authorize(permissions.manageContent, "manage documents");
  if (auth.error) return auth.error;
  const user = auth.user;

  const { id } = await ctx.params;
  const parsed = body.safeParse(await readJson(req));
  if (!z.string().uuid().safeParse(id).success || !parsed.success) return fail("That change could not be understood.");

  const result = await query(
    `UPDATE organization_documents
        SET published = $1, published_at = CASE WHEN $1 THEN coalesce(published_at, now()) ELSE published_at END,
            updated_at = now()
      WHERE id = $2 AND organization_id = $3`,
    [parsed.data.published, id, user.organizationId]
  );
  if (!result.rowCount) return fail("Document not found.", 404);

  await audit(user.organizationId, user.id, parsed.data.published ? "DOCUMENT_PUBLISHED" : "DOCUMENT_UNPUBLISHED", "DOCUMENT", id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await authorize(permissions.manageContent, "delete documents");
  if (auth.error) return auth.error;
  const user = auth.user;

  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) return fail("Document not found.", 404);

  const removed = await query<{ file_url: string | null; title: string }>(
    "DELETE FROM organization_documents WHERE id = $1 AND organization_id = $2 RETURNING file_url, title",
    [id, user.organizationId]
  );
  if (!removed.rowCount) return fail("Document not found.", 404);

  const key = removed.rows[0].file_url;
  if (key && storageConfigured()) {
    await deleteFromR2(key).catch((e) => console.error("DOCUMENT_DELETE_STORAGE_ERROR", e));
  }

  await audit(user.organizationId, user.id, "DOCUMENT_DELETED", "DOCUMENT", id, { title: removed.rows[0].title });
  return NextResponse.json({ ok: true });
}
