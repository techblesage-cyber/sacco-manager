import { query } from "./db";

export const NOTICE_DAYS = 30;
export const GRACE_DAYS = 30;

export type LicenceState = "unlimited" | "active" | "expiring" | "grace" | "expired";

export type Licence = {
  state: LicenceState;
  expiresAt: Date | null;
};

const DAY = 24 * 60 * 60 * 1000;

export function evaluateLicence(expiresAt: Date | null, now = new Date()): Licence {
  if (!expiresAt) return { state: "unlimited", expiresAt: null };

  const remaining = expiresAt.getTime() - now.getTime();

  if (remaining > NOTICE_DAYS * DAY) return { state: "active", expiresAt };
  if (remaining > 0) return { state: "expiring", expiresAt };
  if (remaining > -GRACE_DAYS * DAY) return { state: "grace", expiresAt };
  return { state: "expired", expiresAt };
}

export async function getLicence(organizationId: string): Promise<Licence> {
  try {
    const { rows } = await query<{ licence_expires_at: Date | null }>(
      "SELECT licence_expires_at FROM organizations WHERE id = $1",
      [organizationId]
    );
    return evaluateLicence(rows[0]?.licence_expires_at ?? null);
  } catch (error) {
    console.error("Licence status could not be read", error);
    return { state: "unlimited", expiresAt: null };
  }
}

export async function isReadOnly(organizationId: string) {
  return (await getLicence(organizationId)).state === "expired";
}
