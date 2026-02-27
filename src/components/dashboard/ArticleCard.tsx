"use client";

import React from "react";
import { ExternalLink, Star, ChevronDown, ChevronUp } from "lucide-react";
import { KeywordChipList } from "@/components/shared/KeywordChip";
import { parseJsonArray } from "@/lib/utils";
import type { Article } from "@/types";
import { cn } from "@/lib/utils";

interface ArticleCardProps {
  article:   Article;
  className?: string;
  style?:    React.CSSProperties;
}

export function ArticleCard({ article, className, style }: ArticleCardProps) {
  const [expanded,  setExpanded]  = React.useState(false);
  const [imgFailed, setImgFailed] = React.useState(false);

  const keywords  = parseJsonArray(article.keywordsMatched as unknown as string);
  const tags      = parseJsonArray(article.tags as unknown as string);
  const content   = article.manualSummary ?? article.snippet;
  const showImage = !!article.imageUrl && !imgFailed;

  // Split content into paragraphs; show max 3 collapsed
  const allParas   = content ? content.split(/\n\n+/).filter(Boolean) : [];
  const paragraphs = allParas.slice(0, expanded ? undefined : 2);
  const hasMore    = allParas.length > 2;

  return (
    <article
      className={cn("nyt-card group animate-fade-in", className)}
      style={style}
      aria-label={article.title}
    >
      <div className="flex gap-4 items-start">

        {/* ── Text column ───────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">

          {/* Outlet + priority + timestamp */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-widest text-ink-meta font-sans">
              {article.outlet}
            </span>
            {article.priority && (
              <>
                <span className="text-ink-muted text-[10px]">·</span>
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-600">
                  <Star className="h-2.5 w-2.5 fill-amber-600" />
                  Priority
                </span>
              </>
            )}
          </div>

          {/* Headline — bold serif */}
          <h3 className="font-serif font-bold text-ink leading-snug mb-2 text-lg sm:text-xl group-hover:text-ink-meta transition-colors duration-150">
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline underline-offset-2"
            >
              {article.title}
            </a>
          </h3>

          {/* Deck / summary */}
          {paragraphs.length > 0 && (
            <div className="text-sm text-ink-lead leading-relaxed space-y-1.5">
              {paragraphs.map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          )}

          {/* Show more / less */}
          {hasMore && (
            <button
              onClick={() => setExpanded((e) => !e)}
              className="mt-1.5 flex items-center gap-1 text-[11px] text-ink-meta hover:text-ink font-sans font-medium transition-colors"
            >
              {expanded
                ? <><ChevronUp className="h-3 w-3" /> Show less</>
                : <><ChevronDown className="h-3 w-3" /> Show more</>}
            </button>
          )}

          {/* Footer — keywords, tags, read link */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <KeywordChipList keywords={keywords} maxVisible={2} />
            {tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] font-sans uppercase tracking-wider text-ink-muted border border-paper-rule px-1.5 py-0.5"
              >
                {tag}
              </span>
            ))}
            {article.ingestSource === "MANUAL" && (
              <span className="text-[10px] font-sans uppercase tracking-wider text-ink-muted border border-paper-rule px-1.5 py-0.5">
                Manual
              </span>
            )}
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto flex items-center gap-1 text-[11px] font-sans text-ink-meta hover:text-ink transition-colors underline underline-offset-2"
            >
              Read article
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </div>
        </div>

        {/* ── OG image thumbnail ────────────────────────────────────────────── */}
        {showImage && (
          <div className="shrink-0 w-24 h-16 sm:w-36 sm:h-24 relative overflow-hidden bg-paper-hover rounded-sm border border-paper-rule self-start mt-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={article.imageUrl!}
              alt=""
              aria-hidden="true"
              loading="lazy"
              className="w-full h-full object-cover"
              onError={() => setImgFailed(true)}
            />
          </div>
        )}
      </div>
    </article>
  );
}
