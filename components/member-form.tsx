"use client";

import Link from "next/link";
import { useState } from "react";
import { UserPlus } from "lucide-react";
import { Alert, Field, SubmitButton } from "@/components/ui";
import { WelcomeSlip } from "@/components/welcome-slip";
import { sendJson } from "@/lib/client";
import { today } from "@/lib/format";

const empty = {
  memberNo: "",
  firstName: "",
  middleName: "",
  lastName: "",
  phone: "",
  email: "",
  joinDate: today(),
  pin: "",
};

export function MemberForm({ saccoName, saccoCode }: { saccoName: string; saccoCode: string }) {
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{ memberId: string; memberNo: string; pin: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const bind = (key: keyof typeof empty) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value }),
  });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const { ok, data } = await sendJson<{ memberId: string; memberNo: string; pin: string }>(
      "/api/admin/members",
      "POST",
      form
    );
    setBusy(false);

    if (!ok) {
      setError(data.error || "The member could not be registered.");
      return;
    }

    setCreated({
      memberId: data.memberId,
      memberNo: data.memberNo,
      pin: data.pin,
      name: [form.firstName, form.lastName].filter(Boolean).join(" "),
    });
    setForm({ ...empty, joinDate: form.joinDate });
  }

  if (created) {
    return (
      <div className="card max-w-xl p-6 sm:p-8">
        <Alert tone="success">Member {created.memberNo} has been registered.</Alert>
        <div className="mt-6">
          <WelcomeSlip
            saccoName={saccoName}
            saccoCode={saccoCode}
            memberName={created.name}
            memberNo={created.memberNo}
            pin={created.pin}
          />
          <p className="mt-3 text-xs text-[var(--muted)]">
            The PIN is shown only once. Print the slip or hand the details to the member now.
          </p>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={`/admin/members/${created.memberId}`} className="btn btn-primary">
            Open member record
          </Link>
          <button type="button" className="btn btn-secondary" onClick={() => setCreated(null)}>
            Register another
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card max-w-3xl p-5 sm:p-7">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Member number">
          <input required className="field" {...bind("memberNo")} />
        </Field>
        <Field label="Join date">
          <input required type="date" className="field" {...bind("joinDate")} />
        </Field>
        <Field label="First name">
          <input required className="field" autoComplete="off" {...bind("firstName")} />
        </Field>
        <Field label="Middle name">
          <input className="field" autoComplete="off" {...bind("middleName")} />
        </Field>
        <Field label="Last name">
          <input required className="field" autoComplete="off" {...bind("lastName")} />
        </Field>
        <Field label="Phone">
          <input type="tel" inputMode="tel" className="field" {...bind("phone")} />
        </Field>
        <Field label="Email" className="sm:col-span-2">
          <input type="email" inputMode="email" className="field" {...bind("email")} />
        </Field>
        <Field
          label="Initial PIN"
          hint="Leave blank to generate a random 6-digit PIN. Digits only, 6 to 12 long."
          className="sm:col-span-2"
        >
          <input inputMode="numeric" pattern="\d{6,12}" className="field" {...bind("pin")} />
        </Field>
      </div>

      {error && (
        <div className="mt-5">
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      <div className="mt-6">
        <SubmitButton busy={busy} icon={UserPlus} className="w-full sm:w-auto">
          Register member
        </SubmitButton>
      </div>
    </form>
  );
}
