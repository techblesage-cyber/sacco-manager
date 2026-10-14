import { NextResponse } from "next/server";
import { z } from "zod";
import { authorize, fail, readJson } from "@/lib/api";
import { withTransaction } from "@/lib/db";
import { audit } from "@/lib/audit";
import { reference } from "@/lib/ids";
import { allocateRepayment, round2, type ScheduleRow } from "@/lib/loan";
import { permissions } from "@/lib/permissions";

const body = z.object({ amount: z.coerce.number().positive() });

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await authorize(permissions.postRepayments, "post loan repayments");
  if (auth.error) return auth.error;
  const user = auth.user;

  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) return fail("Loan not found.", 404);

  const parsed = body.safeParse(await readJson(req));
  if (!parsed.success) return fail("Enter a valid repayment amount.");
  const amount = round2(parsed.data.amount);
  const txnNo = reference("REP");

  try {
    const result = await withTransaction(async (client) => {
      const loan = await client.query<{ member_id: string; status: string; outstanding_principal: string }>(
        `SELECT member_id, status, outstanding_principal
           FROM loans WHERE id = $1 AND organization_id = $2 FOR UPDATE`,
        [id, user.organizationId]
      );
      const row = loan.rows[0];
      if (!row) throw new Error("NOT_FOUND");
      if (row.status !== "ACTIVE") throw new Error("NOT_ACTIVE");

      const open = await client.query<ScheduleRow>(
        `SELECT id, principal_due, interest_due, principal_paid, interest_paid
           FROM loan_schedule
          WHERE loan_id = $1 AND status <> 'PAID'
          ORDER BY installment_no FOR UPDATE`,
        [id]
      );

      const allocation = allocateRepayment(open.rows, amount);
      if (allocation.unallocated > 0) throw new Error("OVERPAYMENT");

      for (const update of allocation.rows) {
        await client.query(
          `UPDATE loan_schedule SET principal_paid = $1, interest_paid = $2, status = $3 WHERE id = $4`,
          [update.principalPaid, update.interestPaid, update.status, update.id]
        );
      }

      await client.query(
        `INSERT INTO loan_repayments
           (organization_id, member_id, loan_id, txn_no, amount, principal_amount, interest_amount, entered_by)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
        [user.organizationId, row.member_id, id, txnNo, amount, allocation.principal, allocation.interest, user.id]
      );

      const remaining = await client.query("SELECT 1 FROM loan_schedule WHERE loan_id = $1 AND status <> 'PAID' LIMIT 1", [id]);
      const completed = !remaining.rowCount;

      await client.query(
        `UPDATE loans SET outstanding_principal = greatest(outstanding_principal - $1, 0), status = $2 WHERE id = $3`,
        [allocation.principal, completed ? "COMPLETED" : "ACTIVE", id]
      );

      return { principal: allocation.principal, interest: allocation.interest, completed };
    });

    await audit(user.organizationId, user.id, "LOAN_REPAYMENT_POSTED", "LOAN", id, { txnNo, amount });
    return NextResponse.json({ ok: true, txnNo, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    if (message === "NOT_FOUND") return fail("Loan not found.", 404);
    if (message === "NOT_ACTIVE") return fail("Repayments can only be posted to active loans.", 409);
    if (message === "OVERPAYMENT") return fail("That amount is more than the member still owes on this loan.");
    console.error("REPAYMENT_ERROR", e);
    return fail("The repayment could not be posted.", 500);
  }
}
