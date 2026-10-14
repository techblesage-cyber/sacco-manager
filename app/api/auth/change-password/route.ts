import { NextResponse } from "next/server";
import { z } from "zod";
import { destroyOtherSessions, getSession, hashPassword, verifyPassword } from "@/lib/auth";
import { query } from "@/lib/db";
import { audit } from "@/lib/audit";
import { fail, readJson } from "@/lib/api";

const body = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(6).max(200),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return fail("Your session has expired. Please sign in again.", 401);

  const parsed = body.safeParse(await readJson(req));
  if (!parsed.success) return fail("Your new password must be at least 6 characters.");

  const { currentPassword, newPassword } = parsed.data;
  const isStaff = session.role !== "MEMBER";

  if (isStaff && newPassword.length < 10) {
    return fail("Staff passwords must be at least 10 characters.");
  }

  if (currentPassword === newPassword) {
    return fail("Choose a new password that is different from the current one.");
  }

  const { rows } = await query<{ password_hash: string }>(
    "SELECT password_hash FROM users WHERE id = $1",
    [session.id]
  );

  const valid = rows[0]
    ? await verifyPassword(currentPassword, rows[0].password_hash).catch(() => false)
    : false;

  if (!valid) return fail("Your current password is not correct.", 403);

  const hash = await hashPassword(newPassword);
  await query("UPDATE users SET password_hash = $1, must_change_password = false WHERE id = $2", [
    hash,
    session.id,
  ]);
  await destroyOtherSessions(session.id);
  await audit(session.organizationId, session.id, "PASSWORD_CHANGED", "USER", session.id);

  return NextResponse.json({ ok: true });
}
