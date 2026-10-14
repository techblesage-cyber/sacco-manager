import { cookies } from "next/headers";
import crypto from "node:crypto";
import argon2 from "argon2";
import { query } from "./db";

const COOKIE = "sacco_session";
const SESSION_DAYS = 7;

export type SessionUser = {
  id: string;
  organizationId: string;
  memberId: string | null;
  username: string;
  role: string;
  mustChangePassword: boolean;
};

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function verifyPassword(password: string, hash: string) {
  return argon2.verify(hash, password);
}

export async function hashPassword(password: string) {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
}

export function generatePin(length = 6) {
  let pin = "";
  for (let i = 0; i < length; i += 1) pin += crypto.randomInt(0, 10).toString();
  return pin;
}

export async function createSession(userId: string) {
  const raw = crypto.randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 86400000);

  await query("DELETE FROM sessions WHERE expires_at < now()");
  await query(
    "INSERT INTO sessions(user_id, token_hash, expires_at) VALUES($1,$2,$3)",
    [userId, hashToken(raw), expires]
  );

  const store = await cookies();
  store.set(COOKIE, raw, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export async function destroySession() {
  const store = await cookies();
  const raw = store.get(COOKIE)?.value;

  if (raw) {
    await query("DELETE FROM sessions WHERE token_hash=$1", [hashToken(raw)]);
  }

  store.delete(COOKIE);
}

export async function destroyOtherSessions(userId: string) {
  const store = await cookies();
  const raw = store.get(COOKIE)?.value;

  await query(
    "DELETE FROM sessions WHERE user_id=$1 AND ($2::text IS NULL OR token_hash <> $2)",
    [userId, raw ? hashToken(raw) : null]
  );
}

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const raw = store.get(COOKIE)?.value;
  if (!raw) return null;

  const { rows } = await query<SessionUser>(
    `SELECT u.id,
            u.organization_id AS "organizationId",
            u.member_id AS "memberId",
            u.username,
            u.role,
            u.must_change_password AS "mustChangePassword"
       FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1
        AND s.expires_at > now()
        AND u.active = true`,
    [hashToken(raw)]
  );

  return rows[0] ?? null;
}

export async function requireUser(roles?: string[]) {
  const user = await getSession();
  if (!user) throw new Error("UNAUTHENTICATED");
  if (roles && !roles.includes(user.role)) throw new Error("FORBIDDEN");
  return user;
}
