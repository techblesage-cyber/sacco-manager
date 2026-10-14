import type { Metadata } from "next";
import { LoanForm } from "@/components/loan-form";
import { PageHeader } from "@/components/ui";
import { requireStaffPage } from "@/lib/guards";
import { permissions } from "@/lib/permissions";

export const metadata: Metadata = { title: "New loan application" };

export default async function NewLoanPage() {
  await requireStaffPage(permissions.originateLoans);

  return (
    <>
      <PageHeader
        back={{ href: "/admin/loans", label: "Loans" }}
        title="New loan application"
        description="The application goes to an approver. The repayment schedule is created when the loan is disbursed."
      />
      <LoanForm />
    </>
  );
}
