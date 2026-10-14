import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const session = await getSession();
  if (session) redirect(session.role === "MEMBER" ? "/member" : "/admin");

  const { code } = await searchParams;
  const defaultCode = (code ?? "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 12).toUpperCase();

  return <LoginForm defaultCode={defaultCode} />;
}
