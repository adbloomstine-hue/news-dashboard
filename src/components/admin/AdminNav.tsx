"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Inbox, LayoutDashboard, PlusCircle, History, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { Logo } from "@/components/shared/Logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ── Nav items ─────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { href: "/admin/queue",        label: "Review Queue",  icon: Inbox },
  { href: "/admin/manual-entry", label: "Manual Entry",  icon: PlusCircle },
  { href: "/admin/audit",        label: "Audit Log",     icon: History },
  { href: "/",                   label: "Public View",   icon: LayoutDashboard },
] as const;

// ── Component ─────────────────────────────────────────────────────────────────

export function AdminNav() {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 flex flex-col border-r border-surface-border bg-bg-muted min-h-screen">

      {/* ── Logo header ─────────────────────────────────────────────────── */}
      <div className="relative flex flex-col items-center px-4 pt-6 pb-5 border-b border-surface-border overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(30,107,192,0.12)_0%,transparent_70%)] pointer-events-none" />
        <Logo size="md" showText={false} />
        <div className="mt-3 text-center">
          <p className="font-display font-bold text-white text-sm leading-tight">CGA News</p>
          <p className="text-[10px] text-[--text-muted] mt-0.5 tracking-wide uppercase">Admin Dashboard</p>
        </div>
      </div>

      {/* ── Nav items ────────────────────────────────────────────────────── */}
      <nav className="flex-1 space-y-0.5 px-3 pt-4" aria-label="Admin navigation">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                active ? "nav-item-active" : "nav-item"
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className={cn("h-4 w-4 shrink-0", active && "text-brand-400")} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* ── Bottom actions ───────────────────────────────────────────────── */}
      <div className="px-3 pt-3 pb-5 border-t border-surface-border mt-4">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2.5 text-sm text-white/40 hover:text-white/80"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}
