import { z } from "zod";
import { fail } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { getFromR2, storageConfigured } from "@/lib/r2";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return fail("Please sign in.", 401);

  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) return fail("Document not found.", 404);

  const { rows } = await query<{ file_url: string | null; file_name: string | null; published: boolean }>(
    "SELECT file_url, file_name, published FROM organization_documents WHERE id = $1 AND organization_id = $2",
    [id, session.organizationId]
  );
  const doc = rows[0];

  if (!doc || !doc.file_url || (session.role === "MEMBER" && !doc.published)) {
    return fail("Document not found.", 404);
  }
  if (!storageConfigured()) return fail("Document storage is not available.", 503);

  try {
    const object = await getFromR2(doc.file_url);
    if (!object.Body) return fail("Document not found.", 404);

    const filename = (doc.file_name ?? "document").replace(/[^a-zA-Z0-9._ -]+/g, "_");
    return new Response(object.Body.transformToWebStream(), {
      headers: {
        "Content-Type": object.ContentType ?? "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    console.error("DOCUMENT_DOWNLOAD_ERROR", e);
    return fail("The document could not be retrieved.", 502);
  }
}
