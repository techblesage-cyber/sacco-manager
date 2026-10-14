import { NextResponse } from "next/server";
import { z } from "zod";
import { authorize, fail, readJson } from "@/lib/api";
import { query } from "@/lib/db";
import { audit } from "@/lib/audit";
import { permissions } from "@/lib/permissions";

const body = z.object({
  displayName: z.string().trim().min(2).max(80),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

function isReadableWithWhiteText(hex: string) {
  const channel = (start: number) => {
    const v = parseInt(hex.slice(start, start + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const luminance = 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
  return 1.05 / (luminance + 0.05) >= 4.5;
}

export async function PATCH(req: Request) {
  const auth = await authorize(permissions.manageBranding, "change branding");
  if (auth.error) return auth.error;
  const user = auth.user;

  const parsed = body.safeParse(await readJson(req));
  if (!parsed.success) return fail("Enter a name and a valid colour.");

  if (!isReadableWithWhiteText(parsed.data.primaryColor)) {
    return fail("That colour is too light for white text. Choose a darker one.");
  }

  await query(
    `INSERT INTO organization_settings(organization_id, display_name, primary_color)
     VALUES($1,$2,$3)
     ON CONFLICT (organization_id)
     DO UPDATE SET display_name = EXCLUDED.display_name, primary_color = EXCLUDED.primary_color, updated_at = now()`,
    [user.organizationId, parsed.data.displayName, parsed.data.primaryColor.toLowerCase()]
  );

  await audit(user.organizationId, user.id, "BRANDING_UPDATED", "ORGANIZATION", user.organizationId);
  return NextResponse.json({ ok: true });
}
