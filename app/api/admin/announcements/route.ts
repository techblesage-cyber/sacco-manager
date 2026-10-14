import { NextResponse } from "next/server";
import { z } from "zod";
import { authorize, fail, readJson } from "@/lib/api";
import { query } from "@/lib/db";
import { audit } from "@/lib/audit";
import { permissions } from "@/lib/permissions";

const create = z.object({
  title: z.string().trim().min(2).max(150),
  message: z.string().trim().min(2).max(2000),
  expiresAt: z.string().trim().optional(),
});

const change = z.object({
  id: z.string().uuid(),
  action: z.enum(["activate", "deactivate", "delete"]),
});

export async function POST(req: Request) {
  const auth = await authorize(permissions.manageContent, "post announcements");
  if (auth.error) return auth.error;
  const user = auth.user;

  const parsed = create.safeParse(await readJson(req));
  if (!parsed.success) return fail("Add a title and a message.");

  let expires: Date | null = null;
  if (parsed.data.expiresAt) {
    expires = new Date(`${parsed.data.expiresAt}T23:59:59`);
    if (Number.isNaN(expires.getTime()) || expires.getTime() <= Date.now()) {
      return fail("The end date must be in the future.");
    }
  }

  const created = await query<{ id: string }>(
    `INSERT INTO announcements(organization_id, title, message, expires_at, created_by)
     VALUES($1,$2,$3,$4,$5) RETURNING id`,
    [user.organizationId, parsed.data.title, parsed.data.message, expires, user.id]
  );

  await audit(user.organizationId, user.id, "ANNOUNCEMENT_POSTED", "ANNOUNCEMENT", created.rows[0].id);
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request) {
  const auth = await authorize(permissions.manageContent, "manage announcements");
  if (auth.error) return auth.error;
  const user = auth.user;

  const parsed = change.safeParse(await readJson(req));
  if (!parsed.success) return fail("That change could not be understood.");
  const { id, action } = parsed.data;

  const result =
    action === "delete"
      ? await query("DELETE FROM announcements WHERE id = $1 AND organization_id = $2", [id, user.organizationId])
      : await query(
          "UPDATE announcements SET active = $1, updated_at = now() WHERE id = $2 AND organization_id = $3",
          [action === "activate", id, user.organizationId]
        );

  if (!result.rowCount) return fail("Announcement not found.", 404);
  await audit(user.organizationId, user.id, `ANNOUNCEMENT_${action.toUpperCase()}`, "ANNOUNCEMENT", id);
  return NextResponse.json({ ok: true });
}
