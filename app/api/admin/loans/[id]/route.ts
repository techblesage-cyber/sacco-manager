import { NextResponse } from "next/server";
import { z } from "zod";
import { authorize, fail, readJson } from "@/lib/api";
import { withTransaction } from "@/lib/db";
import { audit } from "@/lib/audit";
import { addMonths, buildSchedule } from "@/lib/loan";
import { permissions } from "@/lib/permissions";
import type { LoanMethod, Role } from "@/types/domain";

const body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve"), note: z.string().trim().max(300).optional() }),
  z.object({ action: z.literal("reject"), note: z.string().trim().min(3).max(300) }),
  z.object({
    action: z.literal("disburse"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  }),
]);

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const parsed = body.safeParse(await readJson(req));
  if (!parsed.success) return fail("A reason is required when rejecting a loan.");
  const input = parsed.data;

  const roles: readonly Role[] =
    input.action === "disburse" ? permissions.disburseLoans : permissions.decideLoans;
  const auth = await authorize(roles, input.action === "disburse" ? "disburse loans" : "decide on loans");
  if (auth.error) return auth.error;
  const user = auth.user;

  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) return fail("Loan not found.", 404);

  try {
    await withTransaction(async (client) => {
      const found = await client.query<{
        status: string;
        principal: string;
        annual_rate: string;
        term_months: number;
        interest_method: LoanMethod;
      }>(
        `SELECT status, principal, annual_rate, term_months, interest_method
           FROM loans WHERE id = $1 AND organization_id = $2 FOR UPDATE`,
        [id, user.organizationId]
      );
      const loan = found.rows[0];
      if (!loan) throw new Error("NOT_FOUND");

      if (input.action === "approve" || input.action === "reject") {
        if (loan.status !== "PENDING_APPROVAL" && loan.status !== "APPLICATION") {
          throw new Error("WRONG_STATE");
        }
        await client.query(
          `UPDATE loans SET status = $1, decided_by = $2, decided_at = now(), decision_note = $3 WHERE id = $4`,
          [input.action === "approve" ? "APPROVED" : "REJECTED", user.id, input.note || null, id]
        );
        return;
      }

      if (loan.status !== "APPROVED") throw new Error("WRONG_STATE");

      const disbursedOn = input.date ?? new Date().toISOString().slice(0, 10);
      const schedule = buildSchedule({
        principal: Number(loan.principal),
        annualRate: Number(loan.annual_rate),
        termMonths: loan.term_months,
        method: loan.interest_method,
        firstDueDate: addMonths(disbursedOn, 1),
      });

      for (const row of schedule) {
        await client.query(
          `INSERT INTO loan_schedule(loan_id, installment_no, due_date, principal_due, interest_due, total_due)
           VALUES($1,$2,$3,$4,$5,$6)`,
          [id, row.no, row.dueDate, row.principal, row.interest, row.total]
        );
      }

      await client.query(
        `UPDATE loans SET status = 'ACTIVE', disbursed_at = $1, outstanding_principal = principal WHERE id = $2`,
        [disbursedOn, id]
      );
    });

    await audit(user.organizationId, user.id, `LOAN_${input.action.toUpperCase()}`, "LOAN", id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    if (message === "NOT_FOUND") return fail("Loan not found.", 404);
    if (message === "WRONG_STATE") return fail("This loan is not at the right stage for that action.", 409);
    console.error("LOAN_ACTION_ERROR", e);
    return fail("The loan could not be updated.", 500);
  }
}
