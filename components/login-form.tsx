"use client";

import { useEffect, useState } from "react";
import { Building2, Eye, EyeOff, Landmark, LockKeyhole, LogIn, UserRound } from "lucide-react";
import { Alert, Field, SubmitButton } from "@/components/ui";
import { sendJson } from "@/lib/client";

export function LoginForm({ defaultCode = "" }: { defaultCode?: string }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [saccoCode, setSaccoCode] = useState(defaultCode);
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (defaultCode) return;
    try {
      const saved = window.localStorage.getItem("sacco-code");
      if (saved) setSaccoCode(saved);
    } catch {
      /* storage unavailable */
    }
  }, [defaultCode]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");

    const { ok, data } = await sendJson<{ redirect?: string }>("/api/auth/login", "POST", {
      saccoCode,
      identifier,
      password,
    });

    if (!ok) {
      setError(data.error || "Sign in failed.");
      setBusy(false);
      return;
    }

    try {
      window.localStorage.setItem("sacco-code", saccoCode);
    } catch {
      /* storage unavailable */
    }

    window.location.href = data.redirect || "/";
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
      <section
        className="hidden flex-col justify-between p-12 text-white lg:flex"
        style={{ background: "var(--brand-deep)" }}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
            <Landmark size={22} />
          </div>
          <div className="text-lg font-semibold">SACCO Manager</div>
        </div>

        <div className="max-w-lg">
          <h1 className="text-4xl font-bold leading-tight tracking-tight">
            Savings, shares and loans in one place.
          </h1>
          <p className="mt-4 text-lg leading-8 text-white/70">
            Members see their own accounts and statements. Staff handle the records their role
            allows.
          </p>
        </div>

        <p className="text-sm text-white/50">
          Keep your password or PIN private. Staff will never ask you for it.
        </p>
      </section>

      <section className="flex items-center justify-center bg-white px-5 py-10 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand)] text-white">
              <Landmark size={20} />
            </div>
            <div className="font-semibold">SACCO Manager</div>
          </div>

          <h2 className="text-2xl font-bold tracking-tight">Sign in</h2>
          <p className="mt-1.5 text-sm text-[var(--muted)]">
            Use the SACCO code you were given, then your member number or username.
          </p>

          <form onSubmit={submit} className="mt-7 space-y-4">
            <Field label="SACCO code">
              <div className="relative">
                <Building2 className="pointer-events-none absolute left-3 top-3.5 text-slate-400" size={18} />
                <input
                  required
                  autoFocus={!defaultCode}
                  autoCapitalize="characters"
                  autoComplete="off"
                  className="field pl-10 font-mono tracking-widest"
                  value={saccoCode}
                  onChange={(e) => setSaccoCode(e.target.value.toUpperCase())}
                />
              </div>
            </Field>

            <Field label="Member number or username">
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-3 top-3.5 text-slate-400" size={18} />
                <input
                  required
                  autoFocus={Boolean(defaultCode)}
                  autoComplete="username"
                  autoCapitalize="none"
                  className="field pl-10"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                />
              </div>
            </Field>

            <Field label="Password or PIN">
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3 top-3.5 text-slate-400" size={18} />
                <input
                  required
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  className="field px-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  aria-label={show ? "Hide password" : "Show password"}
                  className="absolute right-2 top-2 rounded-md p-1.5 text-slate-400 hover:text-slate-600"
                >
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </Field>

            {error && <Alert tone="error">{error}</Alert>}

            <SubmitButton busy={busy} icon={LogIn} className="w-full">
              {busy ? "Signing in…" : "Sign in"}
            </SubmitButton>
          </form>

          <p className="mt-8 text-center text-xs text-[var(--muted)]">
            Forgot your PIN? Ask SACCO staff to reset it for you.
          </p>
          <p className="mt-2 text-center text-xs text-[var(--muted)]">
            Setting up a new SACCO?{" "}
            <a href="/register" className="font-semibold text-[var(--brand)]">Register here</a>
          </p>
        </div>
      </section>
    </main>
  );
}
