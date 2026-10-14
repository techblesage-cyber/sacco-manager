import { Shell } from "@/components/shell";
import { LicenceNotice } from "@/components/licence-notice";
import { requireStaffPage } from "@/lib/guards";
import { getLicence } from "@/lib/licence";
import { getBranding } from "@/lib/org";
import { ForcePasswordChange } from "@/components/change-password-form";
import type { Role } from "@/types/domain";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireStaffPage();
  const [brand, licence] = await Promise.all([
    getBranding(session.organizationId),
    getLicence(session.organizationId),
  ]);

  if (session.mustChangePassword) {
    return <ForcePasswordChange color={brand.color} />;
  }

  return (
    <Shell
      variant="staff"
      role={session.role as Role}
      userName={session.username}
      orgName={brand.name}
      color={brand.color}
    >
      <LicenceNotice licence={licence} />
      {children}
    </Shell>
  );
}
