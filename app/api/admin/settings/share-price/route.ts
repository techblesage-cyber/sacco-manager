import { NextResponse } from "next/server";
import { z } from "zod";
import { authorize, fail, readJson } from "@/lib/api";
import { query } from "@/lib/db";
import { audit } from "@/lib/audit";
import { permissions } from "@/lib/permissions";

const body = z.object({ sharePrice: z.coerce.number().positive().max(1_000_000_000) });

export async function PATCH(req: Request) {
  const auth = await authorize(permissions.manageBranding, "set the share price");
  if (auth.error) return auth.error;
  const user = auth.user;

  const parsed = body.safeParse(await readJson(req));
  if (!parsed.success) return fail("Enter the price of one share as a positive amount.");

  try {
    await query(
      `INSERT INTO organization_settings(organization_id, share_price)
       VALUES($1,$2)
       ON CONFLICT (organization_id)
       DO UPDATE SET share_price = EXCLUDED.share_price, updated_at = now()`,
      [user.organizationId, parsed.data.sharePrice]
    );
  } catch (e) {
    console.error("SHARE_PRICE_ERROR", e);
    return fail("The share price could not be saved. Make sure the latest database update has been applied.", 500);
  }

  await audit(user.organizationId, user.id, "SHARE_PRICE_CHANGED", "ORGANIZATION", user.organizationId, {
    sharePrice: parsed.data.sharePrice,
  });
  return NextResponse.json({ ok: true });
}
