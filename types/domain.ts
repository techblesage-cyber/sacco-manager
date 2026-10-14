export const ROLES = [
  "MEMBER",
  "TELLER",
  "LOAN_OFFICER",
  "APPROVER",
  "TREASURER",
  "ADMINISTRATOR",
  "SUPER_ADMINISTRATOR",
] as const;

export type Role = (typeof ROLES)[number];

export type LoanMethod = "FLAT" | "REDUCING_EMI" | "REDUCING_EQUAL_PRINCIPAL";

export const ROLE_LABELS: Record<Role, string> = {
  MEMBER: "Member",
  TELLER: "Teller",
  LOAN_OFFICER: "Loan officer",
  APPROVER: "Approver",
  TREASURER: "Treasurer",
  ADMINISTRATOR: "Administrator",
  SUPER_ADMINISTRATOR: "Super administrator",
};

export const LOAN_METHOD_LABELS: Record<LoanMethod, string> = {
  FLAT: "Flat rate",
  REDUCING_EMI: "Reducing balance (equal installments)",
  REDUCING_EQUAL_PRINCIPAL: "Reducing balance (equal principal)",
};
