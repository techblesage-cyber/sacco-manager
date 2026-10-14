"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  CircleUserRound,
  FolderOpen,
  HandCoins,
  Landmark,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  MessageSquareWarning,
  PiggyBank,
  Receipt,
  ScrollText,
  Settings,
  ShieldCheck,
  Users,
  WalletCards,
  X,
  type LucideIcon,
} from "lucide-react";
import { permissions, allows } from "@/lib/permissions";
import { initials } from "@/lib/format";
import { ROLE_LABELS, type Role } from "@/types/domain";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  allowed?: Role[];
  tab?: boolean;
};

type NavGroup = { title: string; items: NavItem[] };

const staffNav: NavGroup[] = [
  {
    title: "Overview",
    items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard, tab: true }],
  },
  {
    title: "Operations",
    items: [
      { href: "/admin/members", label: "Members", icon: Users, tab: true },
      { href: "/admin/transactions", label: "Savings & shares", icon: WalletCards, tab: true },
      { href: "/admin/loans", label: "Loans", icon: HandCoins, tab: true },
      { href: "/admin/complaints", label: "Complaints", icon: MessageSquareWarning, allowed: permissions.handleComplaints },
    ],
  },
  {
    title: "Content",
    items: [
      { href: "/admin/documents", label: "Documents", icon: FolderOpen, allowed: permissions.manageContent },
      { href: "/admin/constitution", label: "Constitution", icon: ScrollText, allowed: permissions.manageContent },
      { href: "/admin/announcements", label: "Announcements", icon: Megaphone, allowed: permissions.manageContent },
    ],
  },
  {
    title: "Administration",
    items: [
      { href: "/admin/reports", label: "Reports", icon: BarChart3, allowed: permissions.viewReports },
      { href: "/admin/audit-log", label: "Audit log", icon: ShieldCheck, allowed: permissions.viewAudit },
      { href: "/admin/settings", label: "Settings", icon: Settings, allowed: permissions.manageBranding },
    ],
  },
];

const memberNav: NavGroup[] = [
  {
    title: "My account",
    items: [
      { href: "/member", label: "Home", icon: LayoutDashboard, tab: true },
      { href: "/member/savings", label: "Savings", icon: PiggyBank, tab: true },
      { href: "/member/shares", label: "Shares", icon: Landmark },
      { href: "/member/loans", label: "Loans", icon: HandCoins, tab: true },
      { href: "/member/transactions", label: "Statement", icon: Receipt },
      { href: "/member/complaints", label: "Support", icon: MessageSquareWarning, tab: true },
    ],
  },
  {
    title: "SACCO",
    items: [
      { href: "/member/documents", label: "Documents", icon: FolderOpen },
      { href: "/member/about", label: "Constitution", icon: ScrollText },
    ],
  },
  {
    title: "Account",
    items: [{ href: "/member/profile", label: "Profile & security", icon: CircleUserRound }],
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin" || href === "/member") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Shell({
  children,
  variant,
  role,
  userName,
  orgName,
  color,
}: {
  children: React.ReactNode;
  variant: "staff" | "member";
  role: Role;
  userName: string;
  orgName: string;
  color: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const groups = (variant === "staff" ? staffNav : memberNav)
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.allowed || allows(role, item.allowed)),
    }))
    .filter((group) => group.items.length > 0);

  const tabs = groups.flatMap((group) => group.items).filter((item) => item.tab);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const navigation = (
    <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Main">
      {groups.map((group) => (
        <div key={group.title} className="mb-5">
          <div className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-widest text-white/45">
            {group.title}
          </div>
          {group.items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="nav-link mb-0.5"
              aria-current={isActive(pathname, item.href) ? "page" : undefined}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );

  const account = (
    <div className="border-t border-white/10 p-3">
      <div className="flex items-center gap-3 rounded-lg px-2 py-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs font-bold text-white">
          {initials(userName)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-white">{userName}</div>
          <div className="truncate text-xs text-white/55">{ROLE_LABELS[role]}</div>
        </div>
        <form action="/api/auth/logout" method="post">
          <button
            type="submit"
            title="Sign out"
            aria-label="Sign out"
            className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white"
          >
            <LogOut size={18} />
          </button>
        </form>
      </div>
    </div>
  );

  const brandBlock = (
    <div className="flex h-16 shrink-0 items-center gap-3 border-b border-white/10 px-5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white">
        <Landmark size={19} />
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-white">{orgName}</div>
        <div className="text-[11px] text-white/55">
          {variant === "staff" ? "Administration" : "Member portal"}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ "--brand": color } as React.CSSProperties}>
      <aside
        className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 flex-col lg:flex"
        style={{ background: "var(--brand-deep)" }}
      >
        {brandBlock}
        {navigation}
        {account}
      </aside>

      <header
        className="no-print sticky top-0 z-20 flex items-center justify-between border-b border-[var(--line)] bg-white/95 px-4 backdrop-blur lg:hidden"
        style={{ height: "var(--bar-height)", paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--brand)] text-white">
            <Landmark size={17} />
          </div>
          <span className="truncate text-sm font-semibold">{orgName}</span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
          className="rounded-lg p-2 text-[var(--ink-soft)] hover:bg-slate-100"
        >
          <Menu size={22} />
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-slate-900/50"
            onClick={() => setOpen(false)}
          />
          <div
            className="absolute inset-y-0 right-0 flex w-[19rem] max-w-[86%] flex-col shadow-2xl"
            style={{ background: "var(--brand-deep)", paddingTop: "env(safe-area-inset-top)" }}
          >
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-5">
              <span className="text-sm font-semibold text-white">Menu</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            {navigation}
            <div style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>{account}</div>
          </div>
        </div>
      )}

      <div className="lg:pl-64">
        <main className="mx-auto w-full max-w-7xl px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-12 lg:pt-8">
          {children}
        </main>
      </div>

      <nav
        aria-label="Quick navigation"
        className="no-print fixed inset-x-0 bottom-0 z-20 flex border-t border-[var(--line)] bg-white/95 backdrop-blur lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {tabs.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="tab-link"
            aria-current={isActive(pathname, item.href) ? "page" : undefined}
          >
            <item.icon size={21} />
            <span className="truncate">{item.label}</span>
          </Link>
        ))}
        <button type="button" className="tab-link" onClick={() => setOpen(true)}>
          <Menu size={21} />
          <span>More</span>
        </button>
      </nav>
    </div>
  );
}
