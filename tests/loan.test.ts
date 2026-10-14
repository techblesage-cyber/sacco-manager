import { describe, expect, it } from "vitest";
import { addMonths, allocateRepayment, buildSchedule, summarize } from "../lib/loan";

describe("loan schedules", () => {
  it("builds a flat schedule that adds up exactly", () => {
    const schedule = buildSchedule({
      principal: 1000000,
      annualRate: 24,
      termMonths: 12,
      method: "FLAT",
      firstDueDate: "2026-02-01",
    });
    const totals = summarize(schedule);

    expect(schedule).toHaveLength(12);
    expect(totals.principal).toBe(1000000);
    expect(totals.interest).toBe(240000);
    expect(schedule[0].total).toBeCloseTo(103333.33, 2);
  });

  it("builds a reducing balance schedule with equal installments", () => {
    const schedule = buildSchedule({
      principal: 1200000,
      annualRate: 18,
      termMonths: 12,
      method: "REDUCING_EMI",
      firstDueDate: "2026-02-01",
    });
    const totals = summarize(schedule);

    expect(totals.principal).toBe(1200000);
    expect(schedule[0].interest).toBe(18000);
    expect(schedule[0].total).toBeCloseTo(schedule[5].total, 0);
    expect(schedule[11].principal + schedule[11].interest).toBeGreaterThan(0);
  });

  it("builds a reducing balance schedule with equal principal", () => {
    const schedule = buildSchedule({
      principal: 600000,
      annualRate: 12,
      termMonths: 6,
      method: "REDUCING_EQUAL_PRINCIPAL",
      firstDueDate: "2026-02-01",
    });

    expect(schedule[0].principal).toBe(100000);
    expect(schedule[0].interest).toBe(6000);
    expect(schedule[5].interest).toBe(1000);
    expect(summarize(schedule).principal).toBe(600000);
  });

  it("handles a zero interest rate", () => {
    const schedule = buildSchedule({
      principal: 300000,
      annualRate: 0,
      termMonths: 3,
      method: "REDUCING_EMI",
      firstDueDate: "2026-02-01",
    });

    expect(summarize(schedule).interest).toBe(0);
    expect(schedule.map((row) => row.principal)).toEqual([100000, 100000, 100000]);
  });

  it("keeps month ends valid", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2026-01-31", 2)).toBe("2026-03-31");
    expect(addMonths("2026-12-15", 1)).toBe("2027-01-15");
  });
});

describe("repayment allocation", () => {
  const rows = [
    { id: "a", principal_due: 100000, interest_due: 20000, principal_paid: 0, interest_paid: 0 },
    { id: "b", principal_due: 100000, interest_due: 15000, principal_paid: 0, interest_paid: 0 },
  ];

  it("pays interest before principal, oldest installment first", () => {
    const result = allocateRepayment(rows, 50000);

    expect(result.interest).toBe(20000);
    expect(result.principal).toBe(30000);
    expect(result.rows[0].status).toBe("PARTIAL");
    expect(result.unallocated).toBe(0);
  });

  it("clears installments and carries the remainder forward", () => {
    const result = allocateRepayment(rows, 150000);

    expect(result.rows[0].status).toBe("PAID");
    expect(result.rows[1].status).toBe("PARTIAL");
    expect(result.principal + result.interest).toBe(150000);
  });

  it("reports any amount above what is owed", () => {
    const result = allocateRepayment(rows, 300000);

    expect(result.unallocated).toBe(65000);
  });
});
