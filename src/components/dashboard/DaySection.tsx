import React from "react";
import { ArticleCard } from "./ArticleCard";
import { formatDate } from "@/lib/utils";
import type { Article } from "@/types";

interface DaySectionProps {
  dateKey:  string; // "YYYY-MM-DD"
  articles: Article[];
}

function getDayLabel(dateKey: string): string {
  const todayUtc = new Date();
  todayUtc.setUTCHours(0, 0, 0, 0);

  const today     = todayUtc.toISOString().split("T")[0];
  const yday      = new Date(todayUtc);
  yday.setUTCDate(yday.getUTCDate() - 1);
  const yesterday = yday.toISOString().split("T")[0];

  if (dateKey === today)     return "Today";
  if (dateKey === yesterday) return "Yesterday";
  return formatDate(dateKey + "T00:00:00");
}

export function DaySection({ dateKey, articles }: DaySectionProps) {
  const label = getDayLabel(dateKey);

  return (
    <section aria-labelledby={`day-${dateKey}`} className="mb-10">
      {/* ── Date header — bold top rule + label ───────────────────────────── */}
      <div className="flex items-center gap-3 border-t-2 border-ink pt-2 mb-0">
        <h2
          id={`day-${dateKey}`}
          className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-ink shrink-0"
        >
          {label}
        </h2>
        <div className="flex-1 h-px bg-paper-rule" />
        <span className="text-[10px] font-sans text-ink-muted shrink-0 tabular-nums">
          {articles.length} {articles.length === 1 ? "article" : "articles"}
        </span>
      </div>

      {/* ── Article cards — separated by hairline rules ────────────────────── */}
      <div>
        {articles.map((article, i) => (
          <ArticleCard
            key={article.id}
            article={article}
            style={{ animationDelay: `${i * 40}ms` } as React.CSSProperties}
          />
        ))}
      </div>
    </section>
  );
}
