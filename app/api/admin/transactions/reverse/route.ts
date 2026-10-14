import { NextResponse } from "next/server";
import { z } from "zod";
import { authorize, fail, readJson } from "@/lib/api";
import { withTransaction } from "@/lib/db";
import { audit } from "@/lib/audit";
import { reference } from "@/lib/ids";
import { permissions } from "@/lib/permissions";

const body = z.object({
  kind: z.enum(["SAVINGS", "SHARES"]),
  txnNo: z.string().trim().min(1).max(100),
  reason: z.string().trim().min(3).max(200),
});

export async function POST(req: Request) {
  const auth = await authorize(permissions.reverseTransactions, "reverse transactions");
  if (auth.error) return auth.error;
  const user = auth.user;

  const parsed = body.safeParse(await readJson(req));
  if (!parsed.success) return fail("Give a short reason for the reversal.");
  const { kind, txnNo, reason } = parsed.data;
  const reversalNo = reference("REV");

  try {
    await withTransaction(async (client) => {
      if (kind === "SAVINGS") {
        const original = await client.query<{
          id: string;
          member_id: string;
          savings_account_id: string;
          txn_type: string;
          amount: string;
        }>(
          `SELECT id, member_id, savings_account_id, txn_type, amount
             FROM savings_transactions WHERE organization_id = $1 AND txn_no = $2 FOR UPDATE`,
          [user.organizationId, txnNo]
        );
        const row = original.rows[0];
        if (!row) throw new Error("NOT_FOUND");
        if (row.txn_type === "REVERSAL") throw new Error("IS_REVERSAL");

        const already = await client.query("SELECT 1 FROM savings_transactions WHERE reversal_of = $1", [row.id]);
        if (already.rowCount) throw new Error("ALREADY_REVERSED");

        const account = await client.query<{ balance: string }>(
          "SELECT balance FROM savings_accounts WHERE id = $1 FOR UPDATE",
          [row.savings_account_id]
        );
        const delta = row.txn_type === "DEPOSIT" ? -Number(row.amount) : Number(row.amount);
        if (Number(account.rows[0].balance) + delta < 0) throw new Error("NEGATIVE_BALANCE");

        await client.query("UPDATE savings_accounts SET balance = balance + $1 WHERE id = $2", [
          delta,
          row.savings_account_id,
        ]);
        await client.query(
          `INSERT INTO savings_transactions
             (organization_id, member_id, savings_account_id, txn_no, txn_type, amount, description, entered_by, reversal_of)
           VALUES($1,$2,$3,$4,'REVERSAL',$5,$6,$7,$8)`,
          [
            user.organizationId,
            row.member_id,
            row.savings_account_id,
            reversalNo,
            row.amount,
            `Reversal of ${txnNo}: ${reason}`,
            user.id,
            row.id,
          ]
        );
        return;
      }

      const original = await client.query<{
        id: string;
        member_id: string;
        txn_type: string;
        shares_count: number;
        amount: string;
      }>(
        `SELECT id, member_id, txn_type, shares_count, amount
           FROM share_transactions WHERE organization_id = $1 AND txn_no = $2 FOR UPDATE`,
        [user.organizationId, txnNo]
      );
      const row = original.rows[0];
      if (!row) throw new Error("NOT_FOUND");
      if (row.txn_type === "REVERSAL") throw new Error("IS_REVERSAL");

      const already = await client.query("SELECT 1 FROM share_transactions WHERE reversal_of = $1", [row.id]);
      if (already.rowCount) throw new Error("ALREADY_REVERSED");

      const account = await client.query<{ shares_count: number; share_value: string }>(
        "SELECT shares_count, share_value FROM shares_accounts WHERE member_id = $1 FOR UPDATE",
        [row.member_id]
      );
      if (
        account.rows[0].shares_count - row.shares_count < 0 ||
        Number(account.rows[0].share_value) - Number(row.amount) < 0
      ) {
        throw new Error("NEGATIVE_BALANCE");
      }

      await client.query(
        "UPDATE shares_accounts SET shares_count = shares_count - $1, share_value = share_value - $2 WHERE member_id = $3",
        [row.shares_count, row.amount, row.member_id]
      );
      await client.query(
        `INSERT INTO share_transactions
           (organization_id, member_id, txn_no, txn_type, shares_count, unit_value, amount, entered_by, reversal_of)
         SELECT organization_id, member_id, $1, 'REVERSAL', shares_count, unit_value, amount, $2, id
           FROM share_transactions WHERE id = $3`,
        [reversalNo, user.id, row.id]
      );
    });

    await audit(user.organizationId, user.id, "TRANSACTION_REVERSED", kind, undefined, { txnNo, reversalNo, reason });
    return NextResponse.json({ ok: true, reversalNo });
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    if (message === "NOT_FOUND") return fail("That transaction was not found.", 404);
    if (message === "IS_REVERSAL") return fail("A reversal cannot be reversed.");
    if (message === "ALREADY_REVERSED") return fail("That transaction has already been reversed.", 409);
    if (message === "NEGATIVE_BALANCE") return fail("Reversing this would leave the account below zero.");
    console.error("REVERSAL_ERROR", e);
    return fail("The reversal could not be posted.", 500);
  }
}
