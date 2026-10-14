import type { Metadata } from "next";
import { RegisterForm } from "@/components/register-form";

export const metadata: Metadata = { title: "Register your SACCO" };

export default function RegisterPage() {
  return <RegisterForm />;
}
