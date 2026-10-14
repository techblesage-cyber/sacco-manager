import type { LoanMethod } from "@/types/domain";

export type Installment = {
  no: number;
  dueDate: string;
  principal: number;
  interest: number;
  total: number;
};

export type ScheduleInput = {
  principal: number;
  annualRate: number;
  termMonths: number;
  method: LoanMethod;
  firstDueDate: string;
};

export function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function addMonths(isoDate: string, months: number) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)
  ).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target.toISOString().slice(0, 10);
}

export function buildSchedule(input: ScheduleInput): Installment[] {
  const { principal, annualRate, termMonths, method, firstDueDate } = input;

  if (!(principal > 0) || !(termMonths > 0) || annualRate < 0) {
    throw new Error("Invalid loan terms");
  }

  const monthlyRate = annualRate / 1200;
  const rows: Installment[] = [];
  let balance = principal;

  const emi =
    monthlyRate === 0
      ? principal / termMonths
      : (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -termMonths));

  const flatInterestTotal = round2(principal * (annualRate / 100) * (termMonths / 12));

  for (let i = 1; i <= termMonths; i += 1) {
    const last = i === termMonths;
    let principalPart: number;
    let interestPart: number;

    if (method === "FLAT") {
      principalPart = last ? balance : round2(principal / termMonths);
      const paidInterest = rows.reduce((sum, row) => sum + row.interest, 0);
      interestPart = last
        ? round2(flatInterestTotal - paidInterest)
        : round2(flatInterestTotal / termMonths);
    } else if (method === "REDUCING_EMI") {
      interestPart = round2(balance * monthlyRate);
      principalPart = last ? balance : round2(emi - interestPart);
    } else {
      interestPart = round2(balance * monthlyRate);
      principalPart = last ? balance : round2(principal / termMonths);
    }

    principalPart = round2(principalPart);
    balance = round2(balance - principalPart);

    rows.push({
      no: i,
      dueDate: addMonths(firstDueDate, i - 1),
      principal: principalPart,
      interest: interestPart,
      total: round2(principalPart + interestPart),
    });
  }

  return rows;
}

export function summarize(schedule: Installment[]) {
  const principal = round2(schedule.reduce((sum, row) => sum + row.principal, 0));
  const interest = round2(schedule.reduce((sum, row) => sum + row.interest, 0));
  return { principal, interest, total: round2(principal + interest) };
}

export type ScheduleRow = {
  id: string;
  principal_due: number | string;
  interest_due: number | string;
  principal_paid: number | string;
  interest_paid: number | string;
};

export type Allocation = {
  rows: { id: string; principalPaid: number; interestPaid: number; status: "PARTIAL" | "PAID" }[];
  principal: number;
  interest: number;
  unallocated: number;
};

export function allocateRepayment(rows: ScheduleRow[], amount: number): Allocation {
  let remaining = round2(amount);
  let principalTotal = 0;
  let interestTotal = 0;
  const updates: Allocation["rows"] = [];

  for (const row of rows) {
    if (remaining <= 0) break;

    const interestOpen = round2(Number(row.interest_due) - Number(row.interest_paid));
    const principalOpen = round2(Number(row.principal_due) - Number(row.principal_paid));
    if (interestOpen <= 0 && principalOpen <= 0) continue;

    const interestNow = round2(Math.min(remaining, Math.max(interestOpen, 0)));
    remaining = round2(remaining - interestNow);
    const principalNow = round2(Math.min(remaining, Math.max(principalOpen, 0)));
    remaining = round2(remaining - principalNow);

    principalTotal = round2(principalTotal + principalNow);
    interestTotal = round2(interestTotal + interestNow);

    const interestPaid = round2(Number(row.interest_paid) + interestNow);
    const principalPaid = round2(Number(row.principal_paid) + principalNow);
    const cleared =
      interestPaid >= Number(row.interest_due) && principalPaid >= Number(row.principal_due);

    updates.push({
      id: row.id,
      principalPaid,
      interestPaid,
      status: cleared ? "PAID" : "PARTIAL",
    });
  }

  return { rows: updates, principal: principalTotal, interest: interestTotal, unallocated: remaining };
}
