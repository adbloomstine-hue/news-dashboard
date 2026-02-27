"use client";

import React from "react";
import { formatRelativeTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { AuditLogEntry } from "@/types";
import { cn } from "@/lib/utils";

const ACTION_BADGES: Record<string, { label: string; variant: string }> = {
  APPROVED:     { label: "Approved",      variant: "success" },
  REJECTED:     { label: "Rejected",      variant: "danger"  },
  EDITED:       { label: "Edited",        variant: "default" },
  INGESTED:     { label: "Ingested",      variant: "muted"   },
  QUEUED:       { label: "Queued",        variant: "muted"   },
  MANUAL_ENTRY: { label: "Manual Entry",  variant: "warning" },
  NEEDS_MANUAL: { label: "Needs Manual",  variant: "warning" },
};

interface AuditLogTableProps {
  entries: AuditLogEntry[];
}

export function AuditLogTable({ entries }: AuditLogTableProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-12 text-[--text-muted]">
        <p>No audit log entries yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-surface-border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface-border bg-surface-raised">
            <th className="text-left px-4 py-3 text-xs font-semibold text-[--text-secondary] uppercase tracking-wide">
              Action
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-[--text-secondary] uppercase tracking-wide">
              Article
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-[--text-secondary] uppercase tracking-wide">
              Actor
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-[--text-secondary] uppercase tracking-wide">
              When
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border">
          {entries.map((entry, i) => {
            const badge = ACTION_BADGES[entry.action] ?? { label: entry.action, variant: "muted" };
            return (
              <tr
                key={entry.id}
                className={cn(
                  "transition-colors hover:bg-surface-raised/50",
                  i % 2 === 0 ? "bg-surface" : "bg-bg-base/50"
                )}
              >
                <td className="px-4 py-3">
                  <Badge variant={badge.variant as never}>{badge.label}</Badge>
                </td>
                <td className="px-4 py-3 max-w-[280px]">
                  {entry.article ? (
                    <div>
                      <p className="text-[--text-primary] font-medium truncate">
                        {entry.article.title}
                      </p>
                      <p className="text-[--text-muted] text-xs">{entry.article.outlet}</p>
                    </div>
                  ) : (
                    <span className="text-[--text-muted]">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-[--text-secondary]">{entry.actorEmail}</td>
                <td className="px-4 py-3 text-[--text-muted] text-xs whitespace-nowrap">
                  {formatRelativeTime(entry.timestamp)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
