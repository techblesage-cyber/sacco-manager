import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authorize, fail, readJson } from "@/lib/api";
import { hashPassword } from "@/lib/auth";
import { query } from "@/lib/db";
import { audit } from "@/lib/audit";
import { permissions } from "@/lib/permissions";

const STAFF_ROLES = ["TELLER", "LOAN_OFFICER", "APPROVER", "TREASURER", "ADMINISTRATOR", "SUPER_ADMINISTRATOR"] as const;

const create = z.object({
  username: z.string().trim().min(3).max(60).regex(/^[a-zA-Z0-9._-]+$/),
  role: z.enum(STAFF_ROLES),
});

const change = z.object({
  id: z.string().uuid(),
  action: z.enum(["activate", "deactivate", "reset_password"]),
});

function temporaryPassword() {
  return crypto.randomBytes(9).toString("base64url");
}

export async function POST(req: Request) {
  const auth = await authorize(permissions.manageStaff, "create staff accounts");
  if (auth.error) return auth.error;
  const user = auth.user;

  const parsed = create.safeParse(await readJson(req));
  if (!parsed.success) return fail("Use a username of 3 or more letters, numbers, dots or dashes, and choose a role.");

  const password = temporaryPassword();

  try {
    const created = await query<{ id: string }>(
      `INSERT INTO users(organization_id, username, password_hash, role, must_change_password)
       VALUES($1,$2,$3,$4,true) RETURNING id`,
      [user.organizationId, parsed.data.username, await hashPassword(password), parsed.data.role]
    );
    await audit(user.organizationId, user.id, "STAFF_CREATED", "USER", created.rows[0].id, {
      username: parsed.data.username,
      role: parsed.data.role,
    });
    return NextResponse.json({ ok: true, password });
  } catch (e) {
    if ((e as { code?: string }).code === "23505") return fail("That username is already taken.", 409);
    console.error("STAFF_CREATE_ERROR", e);
    return fail("The account could not be created.", 500);
  }
}

export async function PATCH(req: Request) {
  const auth = await authorize(permissions.manageStaff, "manage staff accounts");
  if (auth.error) return auth.error;
  const user = auth.user;

  const parsed = change.safeParse(await readJson(req));
  if (!parsed.success) return fail("That change could not be understood.");
  const { id, action } = parsed.data;

  if (id === user.id) return fail("You cannot change your own account here.");

  const target = await query<{ id: string }>(
    "SELECT id FROM users WHERE id = $1 AND organization_id = $2 AND role <> 'MEMBER'",
    [id, user.organizationId]
  );
  if (!target.rowCount) return fail("Staff account not found.", 404);

  if (action === "reset_password") {
    const password = temporaryPassword();
    await query("UPDATE users SET password_hash = $1, must_change_password = true WHERE id = $2", [
      await hashPassword(password),
      id,
    ]);
    await query("DELETE FROM sessions WHERE user_id = $1", [id]);
    await audit(user.organizationId, user.id, "STAFF_PASSWORD_RESET", "USER", id);
    return NextResponse.json({ ok: true, password });
  }

  await query("UPDATE users SET active = $1 WHERE id = $2", [action === "activate", id]);
  if (action === "deactivate") await query("DELETE FROM sessions WHERE user_id = $1", [id]);
  await audit(user.organizationId, user.id, action === "activate" ? "STAFF_ACTIVATED" : "STAFF_DEACTIVATED", "USER", id);
  return NextResponse.json({ ok: true });
}
