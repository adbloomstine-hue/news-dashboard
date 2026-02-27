"use client";

import React, { useState } from "react";
import {
  CheckCircle, XCircle, PenSquare, ExternalLink, Clock,
  AlertCircle, Star, Link2,
} from "lucide-react";
import { OutletIcon } from "@/components/shared/OutletIcon";
import { KeywordChipList } from "@/components/shared/KeywordChip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EditArticleModal } from "./EditArticleModal";
import { toast } from "@/lib/use-toast";
import { formatRelativeTime, parseJsonArray } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Article } from "@/types";

interface QueueItemProps {
  article:   Article;
  onAction:  (id: string, action: "APPROVED" | "REJECTED" | "NEEDS_MANUAL") => Promise<void>;
  onUpdated: (updated: Article) => void;
}

const statusConfig = {
  QUEUED:       { label: "Queued",       cls: "status-queued"   },
  APPROVED:     { label: "Approved",     cls: "status-approved" },
  REJECTED:     { label: "Rejected",     cls: "status-rejected" },
  NEEDS_MANUAL: { label: "Needs Manual", cls: "status-manual"   },
};

// Human-readable label and icon for each ingest source
const sourceConfig: Record<string, { label: string; icon?: React.ReactNode }> = {
  RSS:      { label: "RSS" },
  NEWS_API: { label: "News API" },
  MANUAL:   { label: "Manual" },
  URL:      { label: "URL Fetch", icon: <Link2 className="h-2.5 w-2.5" /> },
};

export function QueueItem({ article, onAction, onUpdated }: QueueItemProps) {
  const [loading,    setLoading]    = useState<string | null>(null);
  const [editOpen,   setEditOpen]   = useState(false);
  // lastAction: drives the approve/reject flash animation for 550ms
  const [lastAction, setLastAction] = useState<"APPROVED" | "REJECTED" | null>(null);

  const keywords = parseJsonArray(article.keywordsMatched as unknown as string);
  const tags     = parseJsonArray(article.tags as unknown as string);
  const status   = statusConfig[article.status] ?? statusConfig.QUEUED;

  async function handleAction(action: "APPROVED" | "REJECTED" | "NEEDS_MANUAL") {
    setLoading(action);
    try {
      await onAction(article.id, action);
      // Trigger flash animation
      if (action === "APPROVED" || action === "REJECTED") {
        setLastAction(action);
        setTimeout(() => setLastAction(null), 550);
      }
      toast({
        variant: action === "APPROVED" ? "success" : action === "REJECTED" ? "error" : "warning",
        title:
          action === "APPROVED" ? "Article approved" :
          action === "REJECTED" ? "Article rejected" :
          "Marked for manual entry",
        description: article.title.slice(0, 60) + "…",
      });
    } catch {
      toast({ variant: "error", title: "Action failed", description: "Please try again." });
    } finally {
      setLoading(null);
    }
  }

  return (
    <>
      <div
        className={cn(
          // CGA teal surface with rounded corners (badge motif) + green hover border
          "bg-surface rounded-2xl border border-surface-border p-4",
          "transition-all duration-200 hover:border-brand-600/40 animate-fade-in",
          // Approve/reject flash animations (keyframes defined in tailwind.config.ts)
          lastAction === "APPROVED" && "animate-approve-flash",
          lastAction === "REJECTED" && "animate-reject-flash",
          // Post-action opacity states
          article.status === "APPROVED" && !lastAction && "opacity-60",
          article.status === "REJECTED" && !lastAction && "opacity-40",
          article.priority && "border-l-[3px] border-l-purple-500"
        )}
      >
        <div className="flex gap-3">
          {/* Outlet icon */}
          <OutletIcon domain={article.outletDomain} outlet={article.outlet} size="md" className="mt-0.5" />

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Meta row */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-[--text-secondary] uppercase tracking-wide">
                {article.outlet}
              </span>
              <span className="text-[--text-muted] text-xs">·</span>
              <div className="flex items-center gap-1 text-[--text-muted] text-xs">
                <Clock className="h-3 w-3" />
                {formatRelativeTime(article.publishedAt)}
              </div>
              <span className="text-[--text-muted] text-xs">·</span>
              <Badge
                variant={article.ingestSource === "URL" ? "default" : "muted"}
                className="text-[10px] gap-1"
              >
                {sourceConfig[article.ingestSource]?.icon}
                {sourceConfig[article.ingestSource]?.label ?? article.ingestSource}
              </Badge>
              <span
                className={cn(
                  "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium",
                  status.cls
                )}
              >
                {status.label}
              </span>
              {article.priority && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-purple-400">
                  <Star className="h-2.5 w-2.5 fill-purple-400" /> Priority
                </span>
              )}
            </div>

            {/* Title */}
            <h3 className="font-display font-semibold text-[--text-primary] leading-snug">
              {article.title}
            </h3>

            {/* Snippet */}
            {article.snippet && (
              <p className="text-sm text-[--text-secondary] leading-relaxed line-clamp-3">
                {article.snippet}
              </p>
            )}

            {/* Needs-manual: missing fields panel */}
            {article.status === "NEEDS_MANUAL" && !article.manualSummary && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
                {/* Header */}
                <p className="flex items-center gap-2 text-xs font-semibold text-amber-400">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  Action required — cannot approve until resolved
                </p>

                {/* Missing-field chips */}
                <div className="flex flex-wrap gap-1.5 pl-[22px]">
                  {/* manualSummary is always null here — it's the render condition */}
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold rounded-full px-2 py-0.5 bg-red-500/15 text-red-400 ring-1 ring-inset ring-red-500/25">
                    <XCircle className="h-2.5 w-2.5 shrink-0" />
                    Missing: Summary
                  </span>
                  {tags.length === 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium rounded-full px-2 py-0.5 bg-surface-raised text-[--text-muted] ring-1 ring-inset ring-surface-border">
                      <XCircle className="h-2.5 w-2.5 shrink-0" />
                      No tags added
                    </span>
                  )}
                </div>

                {/* CTA */}
                <p className="text-[11px] text-amber-300/75 pl-[22px]">
                  Click{" "}
                  <span className="font-semibold text-amber-300">Edit</span>{" "}
                  below to fill in the missing fields.
                </p>
              </div>
            )}

            {/* Keywords & tags */}
            <div className="flex items-center gap-2 flex-wrap">
              <KeywordChipList keywords={keywords} maxVisible={3} />
              {tags.map((t) => (
                <Badge key={t} variant="muted" className="text-[10px]">{t}</Badge>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-wrap pt-1">
              {article.status !== "APPROVED" && (
                <Button
                  variant="approve"
                  size="sm"
                  disabled={
                    !!loading ||
                    (article.status === "NEEDS_MANUAL" && !article.manualSummary)
                  }
                  onClick={() => handleAction("APPROVED")}
                >
                  {loading === "APPROVED" ? (
                    <span className="animate-spin h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full" />
                  ) : (
                    <CheckCircle className="h-3.5 w-3.5" />
                  )}
                  Approve
                </Button>
              )}

              {article.status !== "REJECTED" && (
                <Button
                  variant="reject"
                  size="sm"
                  disabled={!!loading}
                  onClick={() => handleAction("REJECTED")}
                >
                  {loading === "REJECTED" ? (
                    <span className="animate-spin h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5" />
                  )}
                  Reject
                </Button>
              )}

              {article.status === "QUEUED" && (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!!loading}
                  onClick={() => handleAction("NEEDS_MANUAL")}
                >
                  <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
                  Needs Manual
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditOpen(true)}
                className={cn(
                  "gap-1",
                  article.status === "NEEDS_MANUAL" && !article.manualSummary
                    ? "text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 font-semibold"
                    : "text-[--text-secondary]"
                )}
              >
                <PenSquare className="h-3.5 w-3.5" />
                Edit
              </Button>

              <Button
                variant="ghost"
                size="icon-sm"
                asChild
                className="text-[--text-muted] hover:text-brand-400"
              >
                <a href={article.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <EditArticleModal
        article={article}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={onUpdated}
      />
    </>
  );
}
