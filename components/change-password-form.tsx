"use client";

import { useState } from "react";
import { KeyRound, ShieldCheck } from "lucide-react";
import { Alert, Field, SubmitButton } from "@/components/ui";
import { sendJson } from "@/lib/client";

export function ChangePasswordForm({ forced = false }: { forced?: boolean }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    if (next !== confirm) {
      setError("The new password and its confirmation do not match.");
      return;
    }

    setBusy(true);
    const { ok, data } = await sendJson("/api/auth/change-password", "POST", {
      currentPassword: current,
      newPassword: next,
    });
    setBusy(false);

    if (!ok) {
      setError(data.error || "The password could not be changed.");
      return;
    }

    if (forced) {
      window.location.reload();
      return;
    }

    setDone(true);
    setCurrent("");
    setNext("");
    setConfirm("");
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label={forced ? "Temporary password or PIN" : "Current password or PIN"}>
        <input
          required
          type="password"
          autoComplete="current-password"
          className="field"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
        />
      </Field>
      <Field label="New password or PIN" hint="Members: at least 6 characters. Staff: at least 10.">
        <input
          required
          type="password"
          autoComplete="new-password"
          minLength={6}
          className="field"
          value={next}
          onChange={(e) => setNext(e.target.value)}
        />
      </Field>
      <Field label="Confirm new password or PIN">
        <input
          required
          type="password"
          autoComplete="new-password"
          className="field"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </Field>

      {error && <Alert tone="error">{error}</Alert>}
      {done && <Alert tone="success">Your password has been changed.</Alert>}

      <SubmitButton busy={busy} icon={KeyRound}>
        Change password
      </SubmitButton>
    </form>
  );
}

export function ForcePasswordChange({ color }: { color: string }) {
  return (
    <main
      className="grid min-h-screen place-items-center px-5 py-10"
      style={{ "--brand": color } as React.CSSProperties}
    >
      <div className="card w-full max-w-md p-6 sm:p-8">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
          <ShieldCheck size={22} />
        </div>
        <h1 className="mt-4 text-xl font-bold tracking-tight">Choose your own password</h1>
        <p className="mb-6 mt-1.5 text-sm text-[var(--muted)]">
          You are using a temporary password. Set a new one that only you know before you continue.
        </p>
        <ChangePasswordForm forced />
      </div>
    </main>
  );
}
