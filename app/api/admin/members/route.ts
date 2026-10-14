import { NextResponse } from "next/server";
import { z } from "zod";
import { authorize, fail, readJson } from "@/lib/api";
import { generatePin, hashPassword } from "@/lib/auth";
import { withTransaction } from "@/lib/db";
import { audit } from "@/lib/audit";
import { permissions } from "@/lib/permissions";

const body = z.object({
  memberNo: z.string().trim().min(1).max(50),
  firstName: z.string().trim().min(1).max(80),
  middleName: z.string().trim().max(80).optional(),
  lastName: z.string().trim().min(1).max(80),
  phone: z.string().trim().max(30).optional(),
  email: z.string().trim().email().max(150).optional().or(z.literal("")),
  joinDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  pin: z.string().trim().regex(/^\d{6,12}$/).optional().or(z.literal("")),
});

export async function POST(req: Request) {
  const auth = await authorize(permissions.registerMembers, "register members");
  if (auth.error) return auth.error;
  const user = auth.user;

  const parsed = body.safeParse(await readJson(req));
  if (!parsed.success) return fail("Check the member details and try again.");

  const data = parsed.data;
  const pin = data.pin || generatePin();
  const hash = await hashPassword(pin);

  try {
    const memberId = await withTransaction(async (client) => {
      const member = await client.query<{ id: string }>(
        `INSERT INTO members(organization_id, member_no, first_name, middle_name, last_name, phone, email, join_date)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
        [
          user.organizationId,
          data.memberNo,
          data.firstName,
          data.middleName || null,
          data.lastName,
          data.phone || null,
          data.email || null,
          data.joinDate,
        ]
      );
      const id = member.rows[0].id;

      await client.query(
        "INSERT INTO savings_accounts(organization_id, member_id, account_no) VALUES($1,$2,$3)",
        [user.organizationId, id, `SAV-${data.memberNo}`]
      );
      await client.query(
        "INSERT INTO shares_accounts(organization_id, member_id) VALUES($1,$2)",
        [user.organizationId, id]
      );
      await client.query(
        `INSERT INTO users(organization_id, member_id, username, password_hash, role, must_change_password)
         VALUES($1,$2,$3,$4,'MEMBER',true)`,
        [user.organizationId, id, `member-${data.memberNo}`, hash]
      );

      return id;
    });

    await audit(user.organizationId, user.id, "MEMBER_CREATED", "MEMBER", memberId, {
      memberNo: data.memberNo,
    });

    return NextResponse.json({ ok: true, memberId, memberNo: data.memberNo, pin });
  } catch (e) {
    if ((e as { code?: string }).code === "23505") {
      return fail("That member number is already registered.", 409);
    }
    console.error("MEMBER_CREATE_ERROR", e);
    return fail("The member could not be registered.", 500);
  }
}
