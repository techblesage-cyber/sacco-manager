import { NextResponse } from "next/server";
import { z } from "zod";
import { authorize, fail, readJson } from "@/lib/api";
import { query } from "@/lib/db";
import { audit } from "@/lib/audit";
import { reference } from "@/lib/ids";
import { permissions } from "@/lib/permissions";

const body = z.object({
  memberNo: z.string().trim().min(1).max(50),
  productName: z.string().trim().min(2).max(80),
  principal: z.coerce.number().positive(),
  annualRate: z.coerce.number().min(0).max(200),
  termMonths: z.coerce.number().int().min(1).max(360),
  method: z.enum(["FLAT", "REDUCING_EMI", "REDUCING_EQUAL_PRINCIPAL"]),
  purpose: z.string().trim().max(300).optional(),
});

export async function POST(req: Request) {
  const auth = await authorize(permissions.originateLoans, "record loan applications");
  if (auth.error) return auth.error;
  const user = auth.user;

  const parsed = body.safeParse(await readJson(req));
  if (!parsed.success) return fail("Check the loan details and try again.");
  const data = parsed.data;

  const member = await query<{ id: string; status: string }>(
    "SELECT id, status FROM members WHERE organization_id = $1 AND member_no = $2",
    [user.organizationId, data.memberNo]
  );
  if (!member.rowCount) return fail("No member has that number.", 404);
  if (member.rows[0].status !== "ACTIVE") return fail("Loans can only be recorded for active members.");

  const loanNo = reference("LN", 3);

  const created = await query<{ id: string }>(
    `INSERT INTO loans(organization_id, member_id, loan_no, product_name, principal, annual_rate,
                       term_months, interest_method, status, purpose)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,'PENDING_APPROVAL',$9) RETURNING id`,
    [
      user.organizationId,
      member.rows[0].id,
      loanNo,
      data.productName,
      data.principal,
      data.annualRate,
      data.termMonths,
      data.method,
      data.purpose || null,
    ]
  );

  await audit(user.organizationId, user.id, "LOAN_APPLICATION_RECORDED", "LOAN", created.rows[0].id, {
    loanNo,
    memberNo: data.memberNo,
    principal: data.principal,
  });

  return NextResponse.json({ ok: true, id: created.rows[0].id, loanNo });
}
