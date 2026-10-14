import { Alert } from "@/components/ui";
import { date } from "@/lib/format";
import type { Licence } from "@/lib/licence";

export function LicenceNotice({ licence }: { licence: Licence }) {
  if (licence.state === "unlimited" || licence.state === "active" || !licence.expiresAt) return null;

  const on = date(licence.expiresAt);

  return (
    <div className="mb-5">
      {licence.state === "expiring" && (
        <Alert tone="info">Your licence runs out on {on}. Contact your software provider to renew it in good time.</Alert>
      )}
      {licence.state === "grace" && (
        <Alert tone="warning">
          Your licence ran out on {on}. Everything still works for a short grace period. Renew soon to avoid
          the system becoming read-only.
        </Alert>
      )}
      {licence.state === "expired" && (
        <Alert tone="error">
          Your licence ran out on {on}. Records are read-only: you can view and export everything, but new entries
          are blocked until you renew.
        </Alert>
      )}
    </div>
  );
}
