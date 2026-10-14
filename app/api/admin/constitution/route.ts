import { NextResponse } from "next/server";
import { z } from "zod";
import { authorize, fail, readJson } from "@/lib/api";
import { query } from "@/lib/db";
import { audit } from "@/lib/audit";
import { sanitizeHtml } from "@/lib/sanitize";
import { permissions } from "@/lib/permissions";

const body = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).optional(),
  content: z.string().trim().min(1).max(500000),
});

export async function POST(req: Request) {
  const auth = await authorize(permissions.manageContent, "edit the constitution");
  if (auth.error) return auth.error;
  const user = auth.user;

  const parsed = body.safeParse(await readJson(req));
  if (!parsed.success) return fail("Add a title and the text of the constitution.");

  const content = sanitizeHtml(parsed.data.content);
  if (!content.replace(/<[^>]*>/g, "").trim()) return fail("The constitution cannot be empty.");

  try {
    const existing = await query<{ id: string }>(
      `SELECT id FROM sacco_documents
        WHERE organization_id = $1 AND file_type = 'TEXT'
        ORDER BY created_at DESC LIMIT 1`,
      [user.organizationId]
    );

    let id: string;

    if (existing.rowCount) {
      id = existing.rows[0].id;
      await query(
        `UPDATE sacco_documents
            SET title = $1, description = $2, content = $3, version = version + 1,
                published = true, updated_at = now()
          WHERE id = $4`,
        [parsed.data.title, parsed.data.description || null, content, id]
      );
    } else {
      const created = await query<{ id: string }>(
        `INSERT INTO sacco_documents(organization_id, title, description, content, file_type, uploaded_by)
         VALUES($1,$2,$3,$4,'TEXT',$5) RETURNING id`,
        [user.organizationId, parsed.data.title, parsed.data.description || null, content, user.id]
      );
      id = created.rows[0].id;
    }

    await audit(user.organizationId, user.id, "CONSTITUTION_SAVED", "SACCO_DOCUMENT", id);
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    console.error("CONSTITUTION_SAVE_ERROR", e);
    return fail("The constitution could not be saved.", 500);
  }
}
