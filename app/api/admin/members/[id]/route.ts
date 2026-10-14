import { NextResponse } from "next/server";
import { z } from "zod";
import { authorize, fail, readJson } from "@/lib/api";
import { generatePin, hashPassword } from "@/lib/auth";
import { query, withTransaction } from "@/lib/db";
import { audit } from "@/lib/audit";
import { permissions } from "@/lib/permissions";

const body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("reset_pin") }),
  z.object({
    action: z.literal("set_status"),
    status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "EXITED"]),
  }),
  z.object({
    action: z.literal("update_contact"),
    phone: z.string().trim().max(30).optional(),
    email: z.string().trim().email().max(150).optional().or(z.literal("")),
  }),
]);

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await authorize(permissions.manageMembers, "manage members");
  if (auth.error) return auth.error;
  const user = auth.user;

  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) return fail("Member not found.", 404);

  const parsed = body.safeParse(await readJson(req));
  if (!parsed.success) return fail("That change could not be understood.");

  const found = await query<{ member_no: string }>(
    "SELECT member_no FROM members WHERE id = $1 AND organization_id = $2",
    [id, user.organizationId]
  );
  if (!found.rowCount) return fail("Member not found.", 404);
  const memberNo = found.rows[0].member_no;

  const input = parsed.data;

  if (input.action === "reset_pin") {
    const pin = generatePin();
    const hash = await hashPassword(pin);

    await withTransaction(async (client) => {
      const updated = await client.query(
        `UPDATE users SET password_hash = $1, must_change_password = true, active = true
          WHERE member_id = $2 AND organization_id = $3`,
        [hash, id, user.organizationId]
      );

      if (!updated.rowCount) {
        await client.query(
          `INSERT INTO users(organization_id, member_id, username, password_hash, role, must_change_password)
           VALUES($1,$2,$3,$4,'MEMBER',true)`,
          [user.organizationId, id, `member-${memberNo}`, hash]
        );
      }

      await client.query(
        "DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE member_id = $1)",
        [id]
      );
    });

    await audit(user.organizationId, user.id, "MEMBER_PIN_RESET", "MEMBER", id);
    return NextResponse.json({ ok: true, pin });
  }

  if (input.action === "set_status") {
    await withTransaction(async (client) => {
      await client.query("UPDATE members SET status = $1 WHERE id = $2", [input.status, id]);
      await client.query("UPDATE users SET active = $1 WHERE member_id = $2", [
        input.status === "ACTIVE",
        id,
      ]);
    });

    await audit(user.organizationId, user.id, "MEMBER_STATUS_CHANGED", "MEMBER", id, {
      status: input.status,
    });
    return NextResponse.json({ ok: true });
  }

  await query("UPDATE members SET phone = $1, email = $2 WHERE id = $3", [
    input.phone || null,
    input.email || null,
    id,
  ]);
  await audit(user.organizationId, user.id, "MEMBER_CONTACT_UPDATED", "MEMBER", id);
  return NextResponse.json({ ok: true });
}
