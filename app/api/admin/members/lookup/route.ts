import { NextResponse } from "next/server";
import { authorize, fail } from "@/lib/api";
import { query } from "@/lib/db";
import { permissions } from "@/lib/permissions";

export async function GET(req: Request) {
  const auth = await authorize(
    [...permissions.postSavings, ...permissions.originateLoans, ...permissions.postRepayments],
    "look up members",
    { readOnly: true }
  );
  if (auth.error) return auth.error;

  const number = new URL(req.url).searchParams.get("no")?.trim();
  if (!number) return fail("Enter a member number.");

  const { rows } = await query<{ name: string; status: string }>(
    `SELECT concat_ws(' ', first_name, middle_name, last_name) AS name, status
       FROM members WHERE organization_id = $1 AND member_no = $2`,
    [auth.user.organizationId, number]
  );

  if (!rows[0]) return fail("No member has that number.", 404);
  return NextResponse.json({ name: rows[0].name, status: rows[0].status });
}
