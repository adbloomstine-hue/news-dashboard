"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Inbox, RefreshCw, Filter, CheckCircle2, XCircle, AlertCircle, Clock,
} from "lucide-react";
import { QueueItem }    from "@/components/admin/QueueItem";
import { UrlFetchBar }  from "@/components/admin/UrlFetchBar";
import { Button }       from "@/components/ui/button";
import { Skeleton }     from "@/components/ui/skeleton";
import { cn }           from "@/lib/utils";
import type { Article, ArticleStatus } from "@/types";

const STATUS_TABS: { label: string; value: string; icon: React.FC<{ className?: string }> }[] = [
  { label: "Queue",    value: "QUEUED,NEEDS_MANUAL", icon: Inbox        },
  { label: "Approved", value: "APPROVED",            icon: CheckCircle2 },
  { label: "Rejected", value: "REJECTED",            icon: XCircle      },
  { label: "All",      value: "all",                 icon: Filter       },
];

export default function QueuePage() {
  const [articles,   setArticles]   = useState<Article[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [activeTab,  setActiveTab]  = useState("QUEUED,NEEDS_MANUAL");
  const [refreshing, setRefreshing] = useState(false);

  const fetchQueue = useCallback(async (tab: string) => {
    setLoading(true);
    try {
      if (tab === "QUEUED,NEEDS_MANUAL") {
        const [q, m] = await Promise.all([
          fetch("/api/queue?status=QUEUED").then((r) => r.json()),
          fetch("/api/queue?status=NEEDS_MANUAL").then((r) => r.json()),
        ]);
        setArticles(
          [...(Array.isArray(q) ? q : []), ...(Array.isArray(m) ? m : [])].sort(
            (a, b) =>
              (b.priority ? 1 : 0) - (a.priority ? 1 : 0) ||
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
        );
      } else {
        const url =
          tab === "all" ? "/api/queue?status=QUEUED" : `/api/queue?status=${tab}`;
        const res  = await fetch(url);
        const data = await res.json();
        setArticles(Array.isArray(data) ? data : []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchQueue(activeTab); }, [activeTab, fetchQueue]);

  // ── URL fetch callback ────────────────────────────────────────────────────
  function handleArticleFetched(article: Article) {
    if (activeTab === "QUEUED,NEEDS_MANUAL") {
      // Already on the right tab — prepend for instant feedback, no loading flash
      setArticles((prev) => [article, ...prev.filter((a) => a.id !== article.id)]);
    } else {
      // Switch to queue tab; the useEffect triggers a fresh fetch
      setActiveTab("QUEUED,NEEDS_MANUAL");
    }
  }

  // ── Approve / Reject / Needs Manual ──────────────────────────────────────
  async function handleAction(id: string, action: "APPROVED" | "REJECTED" | "NEEDS_MANUAL") {
    const endpoint =
      action === "APPROVED"   ? `/api/articles/${id}/approve`
      : action === "REJECTED" ? `/api/articles/${id}/reject`
      : `/api/articles/${id}`;

    const res = await fetch(
      endpoint,
      action === "NEEDS_MANUAL"
        ? {
            method:  "PATCH",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ status: "NEEDS_MANUAL" }),
          }
        : { method: "POST" }
    );
    if (!res.ok) throw new Error("Action failed");

    setArticles((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: action as ArticleStatus } : a))
    );
  }

  function handleUpdated(updated: Article) {
    setArticles((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
  }

  async function handleRefresh() {
    setRefreshing(true);
    await fetchQueue(activeTab);
    setRefreshing(false);
  }

  const counts = {
    queued:   articles.filter((a) => a.status === "QUEUED").length,
    manual:   articles.filter((a) => a.status === "NEEDS_MANUAL").length,
    priority: articles.filter((a) => a.priority).length,
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">

      {/* ── Page header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-[--text-primary]">
            Review Queue
          </h1>
          <p className="text-sm text-[--text-secondary] mt-0.5">
            Approve or reject articles before they appear on the dashboard.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          className="gap-2"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* ── URL Fetch bar (primary add workflow) ─────────────────────── */}
      <UrlFetchBar onArticleFetched={handleArticleFetched} />

      {/* ── Stats row ────────────────────────────────────────────────── */}
      {activeTab === "QUEUED,NEEDS_MANUAL" && !loading && (
        <div className="flex items-center gap-3 flex-wrap">
          <StatChip
            icon={<Inbox className="h-3 w-3" />}
            label="Queued"
            count={counts.queued}
            variant="default"
          />
          <StatChip
            icon={<AlertCircle className="h-3 w-3" />}
            label="Needs Manual"
            count={counts.manual}
            variant="warning"
          />
          <StatChip
            icon={<Clock className="h-3 w-3 text-purple-400" />}
            label="Priority"
            count={counts.priority}
            variant="purple"
          />
        </div>
      )}

      {/* ── Status tabs ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 border-b border-surface-border">
        {STATUS_TABS.map(({ label, value, icon: Icon }) => (
          <button
            key={value}
            onClick={() => setActiveTab(value)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-all duration-150",
              activeTab === value
                ? "border-brand-400 text-brand-400"
                : "border-transparent text-[--text-secondary] hover:text-[--text-primary] hover:border-brand-600/40"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Article list ─────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <QueueItemSkeleton key={i} />)}
        </div>
      ) : articles.length === 0 ? (
        <EmptyState tab={activeTab} />
      ) : (
        <div className="space-y-3">
          {articles.map((article) => (
            <QueueItem
              key={article.id}
              article={article}
              onAction={handleAction}
              onUpdated={handleUpdated}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatChip({
  icon, label, count, variant,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  variant: "default" | "warning" | "purple";
}) {
  const cls = {
    default: "bg-blue-500/10 border-blue-500/20 text-blue-400",
    warning: "bg-amber-500/10 border-amber-500/20 text-amber-400",
    purple:  "bg-purple-500/10 border-purple-500/20 text-purple-400",
  }[variant];

  return (
    <div
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium ${cls}`}
    >
      {icon}
      {label}
      <span className="font-bold">{count}</span>
    </div>
  );
}

function QueueItemSkeleton() {
  return (
    <div className="bg-surface rounded-xl border border-surface-border p-4 space-y-3">
      <div className="flex gap-3">
        <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </div>
    </div>
  );
}

function EmptyState({ tab }: { tab: string }) {
  const isQueue = tab === "QUEUED,NEEDS_MANUAL";
  return (
    <div className="text-center py-16 space-y-3">
      <div className="flex justify-center">
        <div className="h-16 w-16 rounded-2xl bg-surface-raised border border-surface-border flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-emerald-400" />
        </div>
      </div>
      <h3 className="font-display font-semibold text-[--text-primary]">
        {isQueue ? "Queue is clear!" : "No articles found"}
      </h3>
      <p className="text-sm text-[--text-secondary]">
        {isQueue
          ? "Paste a URL above or run ingestion to add articles."
          : "No articles match the selected filter."}
      </p>
    </div>
  );
}
