import { NextResponse } from "next/server";
import { z } from "zod";
import { authorize, fail, readJson } from "@/lib/api";
import { withTransaction } from "@/lib/db";
import { audit } from "@/lib/audit";
import { reference } from "@/lib/ids";
import { getSharePrice } from "@/lib/org";
import { permissions } from "@/lib/permissions";

const body = z.object({
  memberNo: z.string().trim().min(1).max(50),
  shares: z.coerce.number().int().positive().max(100000),
  unitValue: z.coerce.number().positive().optional(),
});

export async function POST(req: Request) {
  const auth = await authorize(permissions.postSavings, "post share purchases");
  if (auth.error) return auth.error;
  const user = auth.user;

  const parsed = body.safeParse(await readJson(req));
  if (!parsed.success) return fail("Enter a valid member number and number of shares.");
  const data = parsed.data;

  const unitValue = (await getSharePrice(user.organizationId)) ?? data.unitValue;
  if (!unitValue) return fail("Enter the price of one share, or ask an administrator to set it in Settings.");

  const amount = Math.round(data.shares * unitValue * 100) / 100;
  const txnNo = reference("SHR");

  try {
    await withTransaction(async (client) => {
      const account = await client.query<{ member_id: string }>(
        `SELECT m.id AS member_id
           FROM members m
           JOIN shares_accounts sh ON sh.member_id = m.id
          WHERE m.organization_id = $1 AND m.member_no = $2 AND m.status = 'ACTIVE'
          FOR UPDATE OF sh`,
        [user.organizationId, data.memberNo]
      );

      if (!account.rowCount) throw new Error("MEMBER_NOT_FOUND");
      const memberId = account.rows[0].member_id;

      await client.query(
        `UPDATE shares_accounts
            SET shares_count = shares_count + $1, share_value = share_value + $2
          WHERE member_id = $3`,
        [data.shares, amount, memberId]
      );
      await client.query(
        `INSERT INTO share_transactions
           (organization_id, member_id, txn_no, txn_type, shares_count, unit_value, amount, entered_by)
         VALUES($1,$2,$3,'PURCHASE',$4,$5,$6,$7)`,
        [user.organizationId, memberId, txnNo, data.shares, unitValue, amount, user.id]
      );
    });

    await audit(user.organizationId, user.id, "SHARES_PURCHASED", "SHARE_TRANSACTION", undefined, {
      txnNo,
      memberNo: data.memberNo,
      shares: data.shares,
      amount,
    });

    return NextResponse.json({ ok: true, txnNo, amount });
  } catch (e) {
    if (e instanceof Error && e.message === "MEMBER_NOT_FOUND") {
      return fail("No active member was found with that number.", 404);
    }
    console.error("SHARES_POST_ERROR", e);
    return fail("The share purchase could not be posted.", 500);
  }
}
