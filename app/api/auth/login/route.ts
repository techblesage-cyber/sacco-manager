import { NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { createSession, verifyPassword } from "@/lib/auth";
import { clearRateLimit, clientIp, rateLimit } from "@/lib/rate-limit";
import { fail, readJson } from "@/lib/api";

const body = z.object({
  saccoCode: z.string().trim().min(2).max(40),
  identifier: z.string().trim().min(1).max(80),
  password: z.string().min(1).max(200),
});

export async function POST(req: Request) {
  const parsed = body.safeParse(await readJson(req));
  if (!parsed.success) return fail("Enter your SACCO code, your number or username, and your password.");

  const { saccoCode, identifier, password } = parsed.data;

  const limitKey = `login:${clientIp(req)}:${saccoCode.toLowerCase()}:${identifier.toLowerCase()}`;
  const limit = rateLimit(limitKey, 8, 15 * 60 * 1000);
  if (!limit.allowed) {
    return fail(`Too many sign-in attempts. Try again in ${Math.ceil(limit.retryAfter / 60)} minute(s).`, 429);
  }

  const { rows } = await query<{ id: string; password_hash: string; role: string; active: boolean }>(
    `SELECT u.id, u.password_hash, u.role, u.active
       FROM users u
       JOIN organizations o ON o.id = u.organization_id
       LEFT JOIN members m ON m.id = u.member_id
      WHERE upper(o.code) = upper($1)
        AND (u.username = $2 OR m.member_no = $2)
      LIMIT 1`,
    [saccoCode, identifier]
  );

  const user = rows[0];
  const valid =
    user && user.active ? await verifyPassword(password, user.password_hash).catch(() => false) : false;

  if (!user || !valid) return fail("Those login details are not correct.", 401);

  clearRateLimit(limitKey);
  await query("UPDATE users SET last_login_at = now() WHERE id = $1", [user.id]);
  await createSession(user.id);

  return NextResponse.json({ ok: true, redirect: user.role === "MEMBER" ? "/member" : "/admin" });
}
