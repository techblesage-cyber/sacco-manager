import { NextResponse } from "next/server";
import { z } from "zod";
import { authorize, fail, readJson } from "@/lib/api";
import { withTransaction } from "@/lib/db";
import { audit } from "@/lib/audit";
import { reference } from "@/lib/ids";
import { permissions } from "@/lib/permissions";

const body = z.object({
  memberNo: z.string().trim().min(1).max(50),
  type: z.enum(["DEPOSIT", "WITHDRAWAL"]),
  amount: z.coerce.number().positive(),
  reference: z.string().trim().max(100).optional(),
  description: z.string().trim().max(250).optional(),
});

export async function POST(req: Request) {
  const auth = await authorize(permissions.postSavings, "post savings transactions");
  if (auth.error) return auth.error;
  const user = auth.user;

  const parsed = body.safeParse(await readJson(req));
  if (!parsed.success) return fail("Enter a valid member number and amount.");
  const data = parsed.data;
  const txnNo = reference("TXN");

  try {
    await withTransaction(async (client) => {
      const account = await client.query<{ id: string; member_id: string; balance: string }>(
        `SELECT sa.id, sa.member_id, sa.balance
           FROM savings_accounts sa
           JOIN members m ON m.id = sa.member_id
          WHERE sa.organization_id = $1 AND m.member_no = $2 AND sa.status = 'ACTIVE'
          FOR UPDATE OF sa`,
        [user.organizationId, data.memberNo]
      );

      if (!account.rowCount) throw new Error("MEMBER_NOT_FOUND");
      const row = account.rows[0];

      if (data.type === "WITHDRAWAL" && Number(row.balance) < data.amount) {
        throw new Error("INSUFFICIENT_FUNDS");
      }

      const delta = data.type === "DEPOSIT" ? data.amount : -data.amount;
      await client.query("UPDATE savings_accounts SET balance = balance + $1 WHERE id = $2", [delta, row.id]);
      await client.query(
        `INSERT INTO savings_transactions
           (organization_id, member_id, savings_account_id, txn_no, txn_type, amount, reference, description, entered_by)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          user.organizationId,
          row.member_id,
          row.id,
          txnNo,
          data.type,
          data.amount,
          data.reference || null,
          data.description || null,
          user.id,
        ]
      );
    });

    await audit(user.organizationId, user.id, "SAVINGS_TRANSACTION_POSTED", "SAVINGS_TRANSACTION", undefined, {
      txnNo,
      memberNo: data.memberNo,
      type: data.type,
      amount: data.amount,
    });

    return NextResponse.json({ ok: true, txnNo });
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    if (message === "MEMBER_NOT_FOUND") return fail("No active savings account was found for that member number.", 404);
    if (message === "INSUFFICIENT_FUNDS") return fail("The withdrawal is more than the member's available savings.");
    console.error("SAVINGS_POST_ERROR", e);
    return fail("The transaction could not be posted.", 500);
  }
}
