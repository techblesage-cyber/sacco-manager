"use client";

import Link from "next/link";
import { useState } from "react";
import { KeyRound, Landmark, ShieldCheck } from "lucide-react";
import { Alert, Field, SubmitButton } from "@/components/ui";
import { sendJson } from "@/lib/client";

export function RegisterForm() {
  const [form, setForm] = useState({ activationKey: "", saccoName: "", username: "", password: "" });
  const [error, setError] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const { ok, data } = await sendJson<{ code: string }>("/api/register", "POST", form);
    setBusy(false);

    if (!ok) {
      setError(data.error || "Registration failed.");
      return;
    }

    setCode(data.code);
  }

  if (code) {
    return (
      <main className="grid min-h-screen place-items-center px-5 py-10">
        <div className="card w-full max-w-md p-6 text-center sm:p-8">
          <ShieldCheck className="mx-auto text-[var(--brand)]" size={36} />
          <h1 className="mt-4 text-xl font-bold">Your SACCO is ready</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            This is your SACCO code. Everyone signs in with it, so keep it somewhere safe. You can see it again
            under Settings.
          </p>
          <div className="mt-5 rounded-xl border border-[var(--brand-line)] bg-[var(--brand-soft)] py-5 text-4xl font-bold tracking-[0.25em]">
            {code}
          </div>
          <Link href={`/login?code=${code}`} className="btn btn-primary mt-6 w-full">
            Continue to sign in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen place-items-center px-5 py-10">
      <form onSubmit={submit} className="card w-full max-w-xl p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
            <Landmark size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Register your SACCO</h1>
            <p className="text-sm text-[var(--muted)]">You will need the activation key you were given.</p>
          </div>
        </div>

        <div className="mt-7 grid gap-4 sm:grid-cols-2">
          <Field label="Activation key" className="sm:col-span-2">
            <input
              required
              autoCapitalize="characters"
              autoComplete="off"
              placeholder="XXXX-XXXX-XXXX-XXXX"
              className="field font-mono tracking-wider"
              value={form.activationKey}
              onChange={(e) => setForm({ ...form, activationKey: e.target.value.toUpperCase() })}
            />
          </Field>
          <Field label="SACCO name" className="sm:col-span-2">
            <input required className="field" value={form.saccoName} onChange={(e) => setForm({ ...form, saccoName: e.target.value })} />
          </Field>
          <Field label="Your username" hint="Letters, numbers, dots or dashes.">
            <input required autoCapitalize="none" autoComplete="username" className="field" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          </Field>
          <Field label="Your password" hint="At least 12 characters.">
            <input required type="password" minLength={12} autoComplete="new-password" className="field" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </Field>
        </div>

        {error && <div className="mt-5"><Alert tone="error">{error}</Alert></div>}

        <SubmitButton busy={busy} icon={KeyRound} className="mt-6 w-full">Create my SACCO</SubmitButton>

        <p className="mt-5 text-center text-sm text-[var(--muted)]">
          Already registered? <Link href="/login" className="font-semibold text-[var(--brand)]">Sign in</Link>
        </p>
      </form>
    </main>
  );
}
