"use client";

import { useState } from "react";
import { KeyRound, Save } from "lucide-react";
import { Alert, Field } from "@/components/ui";
import { WelcomeSlip } from "@/components/welcome-slip";
import { sendJson } from "@/lib/client";

export function MemberActions({
  memberId,
  status,
  phone,
  email,
  hasLogin,
  memberNo,
  memberName,
  saccoName,
  saccoCode,
}: {
  memberNo: string;
  memberName: string;
  saccoName: string;
  saccoCode: string;
  memberId: string;
  status: string;
  phone: string;
  email: string;
  hasLogin: boolean;
}) {
  const url = `/api/admin/members/${memberId}`;
  const [nextStatus, setNextStatus] = useState(status);
  const [contact, setContact] = useState({ phone, email });
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState("");

  async function run(key: string, body: unknown, success: string, after?: (data: Record<string, unknown>) => void) {
    setBusy(key);
    setMessage(null);
    const { ok, data } = await sendJson(url, "PATCH", body);
    setBusy("");

    if (!ok) {
      setMessage({ tone: "error", text: data.error || "That change could not be saved." });
      return;
    }

    setMessage({ tone: "success", text: success });
    after?.(data);
  }

  async function resetPin() {
    const question = hasLogin
      ? "Reset this member's PIN? Their current PIN will stop working."
      : "Create a sign-in account for this member?";
    if (!window.confirm(question)) return;
    await run("pin", { action: "reset_pin" }, "A new temporary PIN has been set.", (data) =>
      setPin(String(data.pin ?? ""))
    );
  }

  return (
    <div className="space-y-6">
      {message && <Alert tone={message.tone}>{message.text}</Alert>}

      <div>
        <h3 className="text-sm font-semibold">Contact details</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Phone">
            <input
              type="tel"
              className="field"
              value={contact.phone}
              onChange={(e) => setContact({ ...contact, phone: e.target.value })}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              className="field"
              value={contact.email}
              onChange={(e) => setContact({ ...contact, email: e.target.value })}
            />
          </Field>
        </div>
        <button
          type="button"
          disabled={busy === "contact"}
          className="btn btn-secondary btn-sm mt-3"
          onClick={() => run("contact", { action: "update_contact", ...contact }, "Contact details saved.")}
        >
          <Save size={15} /> Save contact
        </button>
      </div>

      <div className="border-t border-[var(--line)] pt-5">
        <h3 className="text-sm font-semibold">Membership status</h3>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <select
            className="field sm:max-w-xs"
            value={nextStatus}
            onChange={(e) => setNextStatus(e.target.value)}
            aria-label="Membership status"
          >
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="EXITED">Exited</option>
          </select>
          <button
            type="button"
            disabled={busy === "status" || nextStatus === status}
            className="btn btn-secondary"
            onClick={() => run("status", { action: "set_status", status: nextStatus }, "Status updated.")}
          >
            Update status
          </button>
        </div>
        <p className="hint">Only active members can sign in.</p>
      </div>

      <div className="border-t border-[var(--line)] pt-5">
        <h3 className="text-sm font-semibold">Sign-in access</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {hasLogin
            ? "Set a new temporary PIN if the member has forgotten theirs."
            : "This member does not have a sign-in account yet."}
        </p>
        <button type="button" disabled={busy === "pin"} className="btn btn-secondary mt-3" onClick={resetPin}>
          <KeyRound size={16} /> {hasLogin ? "Reset PIN" : "Create sign-in account"}
        </button>

        {pin && (
          <div className="mt-4">
            <WelcomeSlip saccoName={saccoName} saccoCode={saccoCode} memberName={memberName} memberNo={memberNo} pin={pin} />
            <p className="mt-2 text-xs text-[var(--muted)]">Shown once. The member must change the PIN at next sign-in.</p>
          </div>
        )}
      </div>
    </div>
  );
}
