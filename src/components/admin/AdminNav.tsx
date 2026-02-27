"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Inbox, LayoutDashboard, PlusCircle, History, LogOut, RefreshCw,
  ChevronDown, Tag, Clock, CheckCircle2, X, CalendarRange, ImageIcon,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { Logo } from "@/components/shared/Logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/use-toast";

// ── Types ─────────────────────────────────────────────────────────────────────

type DateRange = "24h" | "3d" | "7d" | "custom" | "all";

interface KeywordStat { term: string; count: number }

interface FeedResult {
  source:          string;
  articlesRaw:     number;
  articlesFound:   number;
  articlesCreated: number;
  articlesDuped:   number;
  errors:          string[];
}

interface IngestionSummary {
  results:      FeedResult[];
  totalFound:   number;
  totalCreated: number;
  totalDuped:   number;
  keywordStats: KeywordStat[];
  finishedAt:   string;
}

interface LastRun {
  finishedAt:      string;
  articlesCreated: number;
  articlesFound:   number;
}

// ── Nav items ─────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { href: "/admin/queue",        label: "Review Queue",   icon: Inbox },
  { href: "/admin/keywords",     label: "Keywords",       icon: Tag },
  { href: "/admin/manual-entry", label: "Manual Entry",  icon: PlusCircle },
  { href: "/admin/audit",        label: "Audit Log",     icon: History },
  { href: "/",                   label: "Public View",   icon: LayoutDashboard },
] as const;

const RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: "24h",    label: "Last 24 hours" },
  { value: "3d",     label: "Last 3 days"   },
  { value: "7d",     label: "Last 7 days"   },
  { value: "custom", label: "Custom range"  },
  { value: "all",    label: "All available" },
];

// ── Relative time helper ──────────────────────────────────────────────────────
function relativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(mins  / 60);
  const days  = Math.floor(hours / 24);
  if (mins  < 1)  return "just now";
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AdminNav() {
  const pathname = usePathname();

  // Ingestion dialog state
  const [dialogOpen,    setDialogOpen]    = React.useState(false);
  const [selectedRange, setSelectedRange] = React.useState<DateRange>("24h");
  const [customFrom,    setCustomFrom]    = React.useState("");
  const [customTo,      setCustomTo]      = React.useState("");
  const [ingesting,     setIngesting]     = React.useState(false);

  // Results panel
  const [summary, setSummary] = React.useState<IngestionSummary | null>(null);

  // Last run info
  const [lastRun, setLastRun] = React.useState<LastRun | null>(null);

  // Refresh-images state
  const [refreshingImages,    setRefreshingImages]    = React.useState(false);
  const [refreshImagesResult, setRefreshImagesResult] = React.useState<{ total: number; updated: number; failed: number } | null>(null);

  // Load last-run info on mount
  React.useEffect(() => {
    fetch("/api/admin/ingest/last-run")
      .then((r) => r.json())
      .then((d) => { if (d.lastRun) setLastRun(d.lastRun); })
      .catch(() => {});
  }, []);

  // Close dialog on Escape
  React.useEffect(() => {
    if (!dialogOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setDialogOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [dialogOpen]);

  async function triggerIngest() {
    setIngesting(true);
    setSummary(null);

    const body: Record<string, string> = {};
    if (selectedRange !== "all" && selectedRange !== "custom") {
      body.range = selectedRange;
    } else if (selectedRange === "custom") {
      if (customFrom) body.from = new Date(customFrom).toISOString();
      if (customTo)   body.to   = new Date(customTo).toISOString();
    }

    try {
      const res = await fetch("/api/ingest", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        toast({ variant: "error", title: data.error ?? "Ingestion failed" });
        return;
      }

      const data: IngestionSummary = await res.json();
      setSummary(data);
      setLastRun({
        finishedAt:      data.finishedAt,
        articlesCreated: data.totalCreated,
        articlesFound:   data.totalFound,
      });

      toast({
        variant:     "success",
        title:       "Ingestion complete",
        description: `${data.totalCreated} new article${data.totalCreated !== 1 ? "s" : ""} added to queue`,
      });
    } catch {
      toast({ variant: "error", title: "Ingestion failed" });
    } finally {
      setIngesting(false);
    }
  }

  async function refreshImages() {
    setRefreshingImages(true);
    setRefreshImagesResult(null);

    try {
      const res = await fetch("/api/admin/articles/refresh-images", { method: "POST" });

      if (!res.ok) {
        const data = await res.json();
        toast({ variant: "error", title: data.error ?? "Image refresh failed" });
        return;
      }

      const data: { total: number; updated: number; failed: number } = await res.json();
      setRefreshImagesResult(data);

      if (data.total === 0) {
        toast({ variant: "success", title: "All articles already have images" });
      } else {
        toast({
          variant:     "success",
          title:       "Image refresh complete",
          description: `${data.updated} image${data.updated !== 1 ? "s" : ""} found from ${data.total} article${data.total !== 1 ? "s" : ""} checked`,
        });
      }
    } catch {
      toast({ variant: "error", title: "Image refresh failed" });
    } finally {
      setRefreshingImages(false);
    }
  }

  return (
    <>
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
        <div className="space-y-1.5 px-3 pt-3 pb-5 border-t border-surface-border mt-4">

          {/* Last run info */}
          {lastRun && (
            <div className="px-3 py-2 rounded-lg bg-surface-raised border border-surface-border mb-2 space-y-0.5">
              <p className="text-[10px] uppercase tracking-wider text-[--text-muted] font-semibold">
                Last run
              </p>
              <p className="text-xs text-white font-medium flex items-center gap-1">
                <Clock className="h-3 w-3 text-[--text-muted] shrink-0" />
                {relativeTime(lastRun.finishedAt)}
              </p>
              <p className="text-[11px] text-[--text-muted]">
                {lastRun.articlesCreated} new · {lastRun.articlesFound} found
              </p>
            </div>
          )}

          {/* Run Ingestion — opens dialog */}
          <Button
            variant="secondary"
            size="sm"
            className="w-full justify-between gap-2 text-sm"
            onClick={() => { setDialogOpen(true); setSummary(null); }}
            disabled={ingesting}
          >
            <span className="flex items-center gap-2">
              <RefreshCw className={cn("h-4 w-4", ingesting && "animate-spin")} />
              {ingesting ? "Ingesting…" : "Run Ingestion"}
            </span>
            <ChevronDown className="h-3.5 w-3.5 opacity-50" />
          </Button>

          {/* Refresh Missing Images */}
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2.5 text-sm text-white/40 hover:text-white/80"
            onClick={refreshImages}
            disabled={refreshingImages || ingesting}
          >
            <ImageIcon className={cn("h-4 w-4", refreshingImages && "animate-pulse")} />
            {refreshingImages ? "Refreshing images…" : "Refresh Missing Images"}
          </Button>

          {/* Inline result after refresh */}
          {refreshImagesResult && !refreshingImages && (
            <p className="px-3 text-[10px] text-[--text-muted] leading-snug">
              {refreshImagesResult.total === 0
                ? "All articles have images."
                : `${refreshImagesResult.updated} found · ${refreshImagesResult.failed} not found · ${refreshImagesResult.total} checked`}
            </p>
          )}

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

      {/* ── Ingestion dialog (modal) ─────────────────────────────────────────── */}
      {dialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setDialogOpen(false); }}
        >
          <div className="w-full max-w-md mx-4 rounded-xl border border-surface-border bg-bg-muted shadow-2xl overflow-hidden">

            {/* Dialog header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
              <div className="flex items-center gap-2">
                <CalendarRange className="h-4 w-4 text-brand-400" />
                <h2 className="font-semibold text-white text-sm">Run Ingestion</h2>
              </div>
              <button
                onClick={() => setDialogOpen(false)}
                className="p-1 rounded-md text-[--text-muted] hover:text-white hover:bg-surface-raised transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">

              {/* Range selector */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-[--text-muted]">
                  Date range
                </label>
                <div className="grid grid-cols-1 gap-1.5">
                  {RANGE_OPTIONS.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setSelectedRange(value)}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-all border",
                        selectedRange === value
                          ? "bg-brand-500/15 border-brand-500/40 text-white"
                          : "border-surface-border text-[--text-muted] hover:text-white hover:border-surface-border/80 hover:bg-surface-raised"
                      )}
                    >
                      <span
                        className={cn(
                          "h-3 w-3 rounded-full border-2 shrink-0",
                          selectedRange === value
                            ? "bg-brand-400 border-brand-400"
                            : "border-[--text-muted]"
                        )}
                      />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom date inputs */}
              {selectedRange === "custom" && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[11px] text-[--text-muted] font-medium">From</label>
                    <input
                      type="date"
                      value={customFrom}
                      onChange={(e) => setCustomFrom(e.target.value)}
                      className="w-full bg-surface-raised border border-surface-border rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand-500/50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-[--text-muted] font-medium">To</label>
                    <input
                      type="date"
                      value={customTo}
                      onChange={(e) => setCustomTo(e.target.value)}
                      className="w-full bg-surface-raised border border-surface-border rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand-500/50"
                    />
                  </div>
                </div>
              )}

              {/* Results summary */}
              {summary && (
                <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-3 space-y-2.5">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Ingestion complete
                  </p>

                  {/* Counts */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[
                      { label: "Found",     value: summary.totalFound   },
                      { label: "New",       value: summary.totalCreated },
                      { label: "Duplicate", value: summary.totalDuped   },
                    ].map(({ label, value }) => (
                      <div key={label} className="rounded-md bg-surface-raised border border-surface-border px-2 py-1.5">
                        <p className="text-base font-bold text-white">{value}</p>
                        <p className="text-[10px] text-[--text-muted] uppercase tracking-wider">{label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Keyword breakdown */}
                  {summary.keywordStats.length > 0 ? (
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-wider text-[--text-muted] font-semibold">
                        Keywords matched
                      </p>
                      <div className="space-y-0.5 max-h-36 overflow-y-auto pr-1">
                        {summary.keywordStats.map(({ term, count }) => (
                          <div key={term} className="flex items-center justify-between text-[11px]">
                            <span className="text-white/80 truncate">{term}</span>
                            <span className="shrink-0 ml-2 font-semibold text-brand-400">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    summary.totalCreated === 0 && (
                      <p className="text-[11px] text-[--text-muted]">
                        No new articles matched your keywords in this time range.
                      </p>
                    )
                  )}

                  {/* Per-feed breakdown */}
                  {summary.results.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-wider text-[--text-muted] font-semibold">
                        Feed details
                      </p>
                      <div className="space-y-0.5">
                        {summary.results.map((r) => (
                          <div key={r.source} className="text-[11px]">
                            <div className="flex items-start gap-1.5">
                              <span className={r.errors.length ? "text-red-400" : "text-white/60"}>
                                {r.errors.length ? "⚠" : "·"}
                              </span>
                              <div className="flex-1 min-w-0">
                                <span className="text-white/80 truncate block" title={r.source}>
                                  {r.source}
                                </span>
                                <span className="text-[--text-muted]">
                                  {r.articlesRaw} fetched → {r.articlesFound} matched → {r.articlesCreated} new
                                </span>
                                {r.errors.length > 0 && (
                                  <span className="block text-red-400/80 truncate" title={r.errors.join("; ")}>
                                    {r.errors[0]}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {summary.totalCreated > 0 && (
                    <Link
                      href="/admin/queue"
                      onClick={() => setDialogOpen(false)}
                      className="block w-full text-center text-[11px] font-medium text-brand-400 hover:text-brand-300 transition-colors"
                    >
                      Review {summary.totalCreated} new article{summary.totalCreated !== 1 ? "s" : ""} in queue →
                    </Link>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 text-[--text-muted] hover:text-white"
                  onClick={() => setDialogOpen(false)}
                  disabled={ingesting}
                >
                  {summary ? "Close" : "Cancel"}
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1 gap-2"
                  onClick={triggerIngest}
                  disabled={ingesting}
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", ingesting && "animate-spin")} />
                  {ingesting ? "Running…" : summary ? "Run Again" : "Run Now"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
