import type { Role } from "@/types/domain";

const ADMINS: Role[] = ["ADMINISTRATOR", "SUPER_ADMINISTRATOR"];

export const permissions = {
  registerMembers: ["TELLER", ...ADMINS] as Role[],
  manageMembers: [...ADMINS] as Role[],
  postSavings: ["TELLER", "TREASURER", ...ADMINS] as Role[],
  reverseTransactions: [...ADMINS, "TREASURER"] as Role[],
  originateLoans: ["LOAN_OFFICER", ...ADMINS] as Role[],
  decideLoans: ["APPROVER", ...ADMINS] as Role[],
  disburseLoans: ["TREASURER", ...ADMINS] as Role[],
  postRepayments: ["TELLER", "TREASURER", "LOAN_OFFICER", ...ADMINS] as Role[],
  handleComplaints: ["LOAN_OFFICER", "APPROVER", ...ADMINS] as Role[],
  manageContent: [...ADMINS] as Role[],
  viewReports: ["TREASURER", "APPROVER", ...ADMINS] as Role[],
  viewAudit: [...ADMINS] as Role[],
  manageBranding: [...ADMINS] as Role[],
  manageStaff: ["SUPER_ADMINISTRATOR"] as Role[],
};

export function allows(role: string, allowed: readonly Role[]) {
  return (allowed as readonly string[]).includes(role);
}
