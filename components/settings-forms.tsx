"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Landmark, Palette, UserPlus } from "lucide-react";
import { Alert, Field, SubmitButton } from "@/components/ui";
import { sendJson } from "@/lib/client";

export function BrandingForm({ displayName, color }: { displayName: string; color: string }) {
  const router = useRouter();
  const [name, setName] = useState(displayName);
  const [primary, setPrimary] = useState(color);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setBusy(true);
    const { ok, data } = await sendJson("/api/admin/settings", "PATCH", { displayName: name, primaryColor: primary });
    setBusy(false);

    if (!ok) {
      setMessage({ tone: "error", text: data.error || "The settings could not be saved." });
      return;
    }

    setMessage({ tone: "success", text: "Saved." });
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Name shown in the portal">
        <input required className="field" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Main colour" hint="Used for buttons, links and the side menu. Pick a darker colour so white text stays readable.">
        <div className="flex items-center gap-3">
          <input
            type="color"
            aria-label="Main colour"
            value={primary}
            onChange={(e) => setPrimary(e.target.value)}
            className="h-11 w-14 cursor-pointer rounded-lg border border-[var(--line-strong)] bg-white p-1"
          />
          <span className="font-mono text-sm text-[var(--muted)]">{primary}</span>
          <span className="ml-auto h-9 flex-1 rounded-lg" style={{ background: primary }} aria-hidden />
        </div>
      </Field>
      {message && <Alert tone={message.tone}>{message.text}</Alert>}
      <SubmitButton busy={busy} icon={Palette}>Save branding</SubmitButton>
    </form>
  );
}

const ROLE_OPTIONS = [
  ["TELLER", "Teller"],
  ["LOAN_OFFICER", "Loan officer"],
  ["APPROVER", "Approver"],
  ["TREASURER", "Treasurer"],
  ["ADMINISTRATOR", "Administrator"],
  ["SUPER_ADMINISTRATOR", "Super administrator"],
];

export function StaffForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("TELLER");
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setPassword("");
    setBusy(true);
    const { ok, data } = await sendJson<{ password: string }>("/api/admin/staff", "POST", { username, role });
    setBusy(false);

    if (!ok) {
      setError(data.error || "The account could not be created.");
      return;
    }

    setPassword(data.password);
    setUsername("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Username">
          <input required autoCapitalize="none" className="field" value={username} onChange={(e) => setUsername(e.target.value)} />
        </Field>
        <Field label="Role">
          <select className="field" value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLE_OPTIONS.map(([value, text]) => (
              <option key={value} value={value}>{text}</option>
            ))}
          </select>
        </Field>
      </div>
      {error && <Alert tone="error">{error}</Alert>}
      {password && (
        <Alert tone="success">
          Account created. Temporary password: <strong className="font-mono">{password}</strong>. Share it privately. It is
          shown only once and must be changed at first sign-in.
        </Alert>
      )}
      <SubmitButton busy={busy} icon={UserPlus}>Create staff account</SubmitButton>
    </form>
  );
}

export function StaffRowActions({ id, active }: { id: string; active: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run(action: "activate" | "deactivate" | "reset_password") {
    if (action === "reset_password" && !window.confirm("Reset this person's password?")) return;
    setBusy(true);
    const { ok, data } = await sendJson<{ password?: string }>("/api/admin/staff", "PATCH", { id, action });
    setBusy(false);

    if (!ok) {
      window.alert(data.error || "That change could not be saved.");
      return;
    }
    if (data.password) window.alert(`Temporary password: ${data.password}\n\nShare it privately. It is shown only once.`);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap justify-end gap-2">
      <button type="button" disabled={busy} className="btn btn-secondary btn-sm" onClick={() => run("reset_password")}>
        Reset password
      </button>
      <button type="button" disabled={busy} className="btn btn-secondary btn-sm" onClick={() => run(active ? "deactivate" : "activate")}>
        {active ? "Deactivate" : "Activate"}
      </button>
    </div>
  );
}

export function SharePriceForm({ price }: { price: number | null }) {
  const router = useRouter();
  const [value, setValue] = useState(price ? String(price) : "");
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setBusy(true);
    const { ok, data } = await sendJson("/api/admin/settings/share-price", "PATCH", { sharePrice: value });
    setBusy(false);

    if (!ok) {
      setMessage({ tone: "error", text: data.error || "The share price could not be saved." });
      return;
    }

    setMessage({ tone: "success", text: "Saved. New share purchases use this price." });
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field
        label="Price of one share (UGX)"
        hint="Applies to future purchases only. Shares already bought keep the price they were bought at."
      >
        <input
          required
          type="number"
          inputMode="decimal"
          min="1"
          step="0.01"
          className="field"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </Field>
      {message && <Alert tone={message.tone}>{message.text}</Alert>}
      <SubmitButton busy={busy} icon={Landmark}>Save share price</SubmitButton>
    </form>
  );
}
