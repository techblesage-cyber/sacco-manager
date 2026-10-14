import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { fail, readJson } from "@/lib/api";
import { hashPassword } from "@/lib/auth";
import { query, withTransaction } from "@/lib/db";
import { DEFAULT_BRAND } from "@/lib/org";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const body = z.object({
  activationKey: z.string().trim().min(8).max(40),
  saccoName: z.string().trim().min(2).max(120),
  username: z.string().trim().min(3).max(60).regex(/^[a-zA-Z0-9._-]+$/),
  password: z.string().min(12).max(200),
});

const DEFAULT_CATEGORIES: [string, string][] = [
  ["Constitution", "SACCO constitution and governing documents"],
  ["Loan forms", "Loan applications, agreements and related forms"],
  ["Membership forms", "Membership registration and member service forms"],
  ["Savings and shares", "Savings and share-related forms"],
  ["Policies", "SACCO policies and guidelines"],
  ["Notices", "Official notices and member communications"],
  ["General", "Other official SACCO documents"],
];

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function newCode() {
  let code = "";
  for (let i = 0; i < 6; i += 1) code += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)];
  return code;
}

async function uniqueCode() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = newCode();
    const taken = await query("SELECT 1 FROM organizations WHERE upper(code) = $1", [code]);
    if (!taken.rowCount) return code;
  }
  throw new Error("CODE_UNAVAILABLE");
}

export async function POST(req: Request) {
  const limit = rateLimit(`register:${clientIp(req)}`, 6, 60 * 60 * 1000);
  if (!limit.allowed) return fail("Too many attempts. Please try again later.", 429);

  const parsed = body.safeParse(await readJson(req));
  if (!parsed.success) {
    return fail("Complete every field. The password needs at least 12 characters.");
  }

  const data = parsed.data;
  const normalizedKey = data.activationKey.replace(/[\s-]/g, "").toUpperCase();
  const keyHash = crypto.createHash("sha256").update(normalizedKey).digest("hex");
  const passwordHash = await hashPassword(data.password);

  try {
    const code = await uniqueCode();

    await withTransaction(async (client) => {
      const key = await client.query<{ id: string; valid_months: number }>(
        `SELECT id, valid_months FROM activation_keys
          WHERE key_hash = $1 AND status = 'UNUSED' FOR UPDATE`,
        [keyHash]
      );
      if (!key.rowCount) throw new Error("BAD_KEY");

      const org = await client.query<{ id: string }>(
        `INSERT INTO organizations(name, code, licence_expires_at)
         VALUES($1, $2, now() + make_interval(months => $3::int)) RETURNING id`,
        [data.saccoName, code, key.rows[0].valid_months]
      );
      const organizationId = org.rows[0].id;

      await client.query(
        `INSERT INTO users(organization_id, username, password_hash, role)
         VALUES($1,$2,$3,'SUPER_ADMINISTRATOR')`,
        [organizationId, data.username, passwordHash]
      );
      await client.query(
        "INSERT INTO organization_settings(organization_id, primary_color) VALUES($1,$2) ON CONFLICT DO NOTHING",
        [organizationId, DEFAULT_BRAND]
      );

      for (const [name, description] of DEFAULT_CATEGORIES) {
        await client.query(
          "INSERT INTO document_categories(organization_id, name, description) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",
          [organizationId, name, description]
        );
      }

      await client.query(
        "UPDATE activation_keys SET status = 'USED', organization_id = $1, used_at = now() WHERE id = $2",
        [organizationId, key.rows[0].id]
      );
    });

    return NextResponse.json({ ok: true, code });
  } catch (e) {
    if (e instanceof Error && e.message === "BAD_KEY") {
      return fail("That activation key is not valid or has already been used.", 403);
    }
    console.error("REGISTER_ERROR", e);
    return fail("The SACCO could not be created. Please try again.", 500);
  }
}
