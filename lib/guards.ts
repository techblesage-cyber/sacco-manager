import { redirect } from "next/navigation";
import { getSession } from "./auth";
import type { Role } from "@/types/domain";

export async function requireStaffPage(roles?: readonly Role[]) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "MEMBER") redirect("/member");
  if (roles && !(roles as readonly string[]).includes(session.role)) redirect("/admin");
  return session;
}

export async function requireMemberPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "MEMBER" || !session.memberId) redirect("/admin");
  return { ...session, memberId: session.memberId };
}
