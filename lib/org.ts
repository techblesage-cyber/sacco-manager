import { cache } from "react";
import { query } from "./db";

export const DEFAULT_BRAND = "#16436f";

export const getBranding = cache(async (organizationId: string) => {
  const { rows } = await query<{
    name: string;
    display_name: string | null;
    primary_color: string | null;
  }>(
    `SELECT o.name, s.display_name, s.primary_color
       FROM organizations o
       LEFT JOIN organization_settings s ON s.organization_id = o.id
      WHERE o.id = $1`,
    [organizationId]
  );

  const row = rows[0];

  return {
    name: row?.display_name || row?.name || "SACCO",
    color: row?.primary_color || DEFAULT_BRAND,
  };
});

export async function getSharePrice(organizationId: string): Promise<number | null> {
  try {
    const { rows } = await query<{ share_price: string | null }>(
      "SELECT share_price FROM organization_settings WHERE organization_id = $1",
      [organizationId]
    );
    const value = rows[0]?.share_price;
    return value ? Number(value) : null;
  } catch (error) {
    console.error("Share price could not be read", error);
    return null;
  }
}
