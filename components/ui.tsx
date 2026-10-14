import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { CircleAlert, CircleCheck, Info, LoaderCircle, TriangleAlert } from "lucide-react";
import { label } from "@/lib/format";

type Tone = "green" | "amber" | "red" | "blue" | "slate";

const TONES: Record<string, Tone> = {
  ACTIVE: "green",
  PAID: "green",
  RESOLVED: "green",
  APPROVED: "green",
  COMPLETED: "green",
  DEPOSIT: "green",
  PURCHASE: "green",
  ACCEPTED: "green",
  OPEN: "amber",
  PENDING: "amber",
  PARTIAL: "amber",
  PENDING_APPROVAL: "amber",
  PENDING_GUARANTORS: "amber",
  APPLICATION: "amber",
  IN_REVIEW: "blue",
  DISBURSED: "blue",
  WITHDRAWAL: "slate",
  REVERSAL: "slate",
  INACTIVE: "slate",
  EXITED: "slate",
  CLOSED: "slate",
  REJECTED: "red",
  SUSPENDED: "red",
  FROZEN: "red",
  WRITTEN_OFF: "red",
  OVERDUE: "red",
  DECLINED: "red",
};

export function Badge({ children, tone = "slate" }: { children: React.ReactNode; tone?: Tone }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={TONES[status] ?? "slate"}>{label(status)}</Badge>;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  back,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {back && (
          <Link
            href={back.href}
            className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-[var(--brand)] hover:underline"
          >
            <span aria-hidden>←</span> {back.label}
          </Link>
        )}
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-[var(--ink)]">{title}</h1>
        {description && (
          <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label: text,
  value,
  icon: Icon,
  hint,
  tone,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  hint?: string;
  tone?: "warn";
}) {
  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[var(--muted)]">{text}</span>
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-lg ${
            tone === "warn" ? "bg-amber-50 text-amber-700" : "bg-[var(--brand-soft)] text-[var(--brand)]"
          }`}
        >
          <Icon size={18} />
        </span>
      </div>
      <div className="mt-3 truncate text-xl font-bold tracking-tight sm:text-2xl">{value}</div>
      {hint && <div className="mt-1 text-xs text-[var(--muted)]">{hint}</div>}
    </div>
  );
}

export function Panel({
  title,
  description,
  actions,
  children,
  flush = false,
  className = "",
}: {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  flush?: boolean;
  className?: string;
}) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-3.5 sm:px-5">
          <div className="min-w-0">
            {title && <h2 className="font-semibold">{title}</h2>}
            {description && <p className="text-xs text-[var(--muted)]">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className={flush ? "" : "p-4 sm:p-5"}>{children}</div>
    </section>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand-soft)] text-[var(--brand)]">
        <Icon size={22} />
      </span>
      <h3 className="mt-4 font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-[var(--muted)]">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Alert({
  tone = "info",
  children,
}: {
  tone?: "error" | "success" | "info" | "warning";
  children: React.ReactNode;
}) {
  const Icon = tone === "error" ? CircleAlert : tone === "success" ? CircleCheck : tone === "warning" ? TriangleAlert : Info;

  return (
    <div className={`alert alert-${tone}`} role={tone === "error" ? "alert" : "status"}>
      <Icon size={17} className="mt-0.5 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function Field({
  label: text,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{text}</span>
      {children}
      {hint && <span className="hint block">{hint}</span>}
    </label>
  );
}

export function SubmitButton({
  busy,
  children,
  className = "",
  icon: Icon,
}: {
  busy?: boolean;
  children: React.ReactNode;
  className?: string;
  icon?: LucideIcon;
}) {
  return (
    <button type="submit" disabled={busy} className={`btn btn-primary ${className}`}>
      {busy ? <LoaderCircle size={17} className="animate-spin" /> : Icon ? <Icon size={17} /> : null}
      {children}
    </button>
  );
}

export function DetailList({ items }: { items: [string, React.ReactNode][] }) {
  return (
    <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
      {items.map(([term, value]) => (
        <div key={term} className="min-w-0">
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{term}</dt>
          <dd className="mt-1 break-words font-medium">{value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function TableWrap({ children }: { children: React.ReactNode }) {
  return <div className="overflow-x-auto">{children}</div>;
}
