import { authorize, fail } from "@/lib/api";
import { pool } from "@/lib/db";
import { permissions } from "@/lib/permissions";

type Report = { file: string; headers: string[]; sql: string };

const REPORTS: Record<string, Report> = {
  members: {
    file: "member-register",
    headers: ["Member no", "Name", "Phone", "Email", "Status", "Joined"],
    sql: `SELECT member_no, concat_ws(' ', first_name, middle_name, last_name), phone, email, status, join_date
            FROM members WHERE organization_id = $1 ORDER BY member_no`,
  },
  savings: {
    file: "savings-balances",
    headers: ["Member no", "Name", "Account", "Balance", "Status"],
    sql: `SELECT m.member_no, concat_ws(' ', m.first_name, m.last_name), sa.account_no, sa.balance, sa.status
            FROM savings_accounts sa JOIN members m ON m.id = sa.member_id
           WHERE sa.organization_id = $1 ORDER BY m.member_no`,
  },
  shares: {
    file: "shareholding",
    headers: ["Member no", "Name", "Shares", "Value"],
    sql: `SELECT m.member_no, concat_ws(' ', m.first_name, m.last_name), sh.shares_count, sh.share_value
            FROM shares_accounts sh JOIN members m ON m.id = sh.member_id
           WHERE sh.organization_id = $1 ORDER BY m.member_no`,
  },
  loans: {
    file: "loan-portfolio",
    headers: ["Loan no", "Member no", "Name", "Product", "Principal", "Rate %", "Term (months)", "Outstanding", "Overdue", "Status"],
    sql: `SELECT l.loan_no, m.member_no, concat_ws(' ', m.first_name, m.last_name), l.product_name, l.principal,
                 l.annual_rate, l.term_months, l.outstanding_principal,
                 coalesce((SELECT sum(total_due - principal_paid - interest_paid) FROM loan_schedule
                            WHERE loan_id = l.id AND status <> 'PAID' AND due_date < current_date), 0),
                 l.status
            FROM loans l JOIN members m ON m.id = l.member_id
           WHERE l.organization_id = $1 ORDER BY l.created_at DESC`,
  },
  transactions: {
    file: "savings-transactions",
    headers: ["Reference", "Date", "Member no", "Name", "Type", "Amount", "Note"],
    sql: `SELECT st.txn_no, st.posted_at, m.member_no, concat_ws(' ', m.first_name, m.last_name),
                 st.txn_type, st.amount, st.description
            FROM savings_transactions st JOIN members m ON m.id = st.member_id
           WHERE st.organization_id = $1 ORDER BY st.posted_at DESC`,
  },
};

function cell(value: unknown) {
  if (value === null || value === undefined) return "";
  const text = value instanceof Date ? value.toISOString() : String(value);
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export async function GET(_req: Request, ctx: { params: Promise<{ name: string }> }) {
  const auth = await authorize(permissions.viewReports, "export reports", { readOnly: true });
  if (auth.error) return auth.error;

  const { name } = await ctx.params;
  const report = REPORTS[name];
  if (!report) return fail("Report not found.", 404);

  const result = await pool.query({
    text: report.sql,
    values: [auth.user.organizationId],
    rowMode: "array",
  });
  const rows: unknown[][] = result.rows;

  const lines = [report.headers.map(cell).join(",")];
  for (const row of rows) lines.push(row.map(cell).join(","));

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response("\uFEFF" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${report.file}-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
