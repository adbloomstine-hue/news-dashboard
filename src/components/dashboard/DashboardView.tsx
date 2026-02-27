"use client";

/**
 * DashboardView — reusable public-facing news dashboard.
 *
 * Shared by the home page and all three section pages. Pass `section` to
 * restrict the article feed; omit it (or pass null) for the full feed.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { RefreshCw } from "lucide-react";
import { DaySection }  from "@/components/dashboard/DaySection";
import { SearchBar }   from "@/components/dashboard/SearchBar";
import { FilterBar }   from "@/components/dashboard/FilterBar";
import { QuickChips }  from "@/components/dashboard/QuickChips";
import { Toaster }     from "@/components/ui/toaster";
import { groupByDate } from "@/lib/utils";
import type { Article, ArticleSection, DashboardFilters } from "@/types";

// ─── Section nav config ────────────────────────────────────────────────────────

const SECTION_NAV: Array<{
  section: ArticleSection | null;
  label:   string;
  href:    string;
}> = [
  { section: null,        label: "Home",                      href: "/"          },
  { section: "cardrooms", label: "California Cardrooms",        href: "/cardrooms" },
  { section: "tribal",    label: "California Tribal Casinos",   href: "/tribal"    },
  { section: "gaming",    label: "California Gaming",          href: "/gaming"    },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMastheadDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year:    "numeric",
    month:   "long",
    day:     "numeric",
  });
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface DashboardViewProps {
  section?: ArticleSection | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DashboardView({ section = null }: DashboardViewProps) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [outlets,  setOutlets]  = useState<string[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [hasMore,  setHasMore]  = useState(false);
  const [page,     setPage]     = useState(1);
  const [search,   setSearch]   = useState("");
  const [filters,  setFilters]  = useState<DashboardFilters>({});
  const [total,    setTotal]    = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchArticles = useCallback(async (
    searchVal:  string,
    filtersVal: DashboardFilters,
    pageNum:    number,
    replace = true,
  ) => {
    setLoading(replace);
    try {
      const params = new URLSearchParams();
      if (searchVal)             params.set("search",     searchVal);
      if (filtersVal.outlet)     params.set("outlet",     filtersVal.outlet);
      if (filtersVal.from)       params.set("from",       filtersVal.from);
      if (filtersVal.to)         params.set("to",         filtersVal.to);
      if (filtersVal.priority)   params.set("priority",   "true");
      if (filtersVal.tag)        params.set("tag",        filtersVal.tag);
      if (filtersVal.quickRange) params.set("quickRange", filtersVal.quickRange);
      if (section)               params.set("section",    section);
      params.set("page",     String(pageNum));
      params.set("pageSize", "20");

      const res  = await fetch(`/api/articles?${params}`);
      const data = await res.json();

      setTotal(data.total ?? 0);
      setHasMore(data.hasMore ?? false);
      setArticles((prev) => replace ? data.items : [...prev, ...data.items]);

      if (replace) {
        const allOutlets = Array.from(
          new Set((data.items as Article[]).map((a: Article) => a.outlet))
        ).sort() as string[];
        setOutlets(allOutlets);
      }
    } finally {
      setLoading(false);
    }
  }, [section]);

  // Re-fetch whenever search, filters, or section changes (debounced 300 ms)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchArticles(search, filters, 1, true);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search, filters, fetchArticles]);

  function handleFilterChange(newFilters: DashboardFilters) {
    setFilters(newFilters);
    setPage(1);
  }

  function handleQuickRange(range: DashboardFilters["quickRange"]) {
    setFilters((f) => ({ ...f, quickRange: range, from: undefined, to: undefined }));
  }

  function loadMore() {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchArticles(search, filters, nextPage, false);
  }

  const grouped  = groupByDate(articles);
  const dateKeys = Array.from(grouped.keys()).sort((a, b) => b.localeCompare(a));

  return (
    <div className="min-h-screen bg-white">
      <Toaster />

      {/* ── Masthead ────────────────────────────────────────────────────────── */}
      <header className="bg-white">
        {/* 4-px black top rule */}
        <div className="h-1 bg-ink" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6">

          {/* Slim date + admin link */}
          <div className="flex items-center justify-between py-2 border-b border-paper-rule">
            <span className="text-[11px] text-ink-meta font-sans">
              {formatMastheadDate()}
            </span>
            <a
              href="/admin/queue"
              className="text-[11px] text-ink-meta hover:text-ink transition-colors"
            >
              Admin →
            </a>
          </div>

          {/* Logotype */}
          <div className="text-center py-5 border-b border-paper-rule">
            <Link href="/" className="inline-flex items-center justify-center gap-3 sm:gap-4">
              <Image
                src="/logo.png"
                alt="CGA Logo"
                width={128}
                height={128}
                className="w-20 h-20 sm:w-28 sm:h-28 object-contain shrink-0"
                priority
              />
              <h1
                className="font-serif font-black text-ink tracking-[-0.02em] leading-none select-none"
                style={{ fontSize: "clamp(2.2rem, 6vw, 4rem)" }}
              >
                CGA NEWS
              </h1>
            </Link>
            <p className="mt-1.5 text-[10px] uppercase tracking-[0.28em] text-ink-meta font-sans">
              California Gaming Association
            </p>
          </div>

          {/* Section nav tabs */}
          <nav className="flex justify-center overflow-x-auto" aria-label="News sections">
            {SECTION_NAV.map(({ section: s, label, href }) => {
              const active = s === section;
              return (
                <Link
                  key={href}
                  href={href}
                  className={[
                    "shrink-0 px-3 sm:px-4 py-3 text-[11px] font-sans font-medium uppercase",
                    "tracking-[0.12em] whitespace-nowrap border-b-2 transition-colors no-underline",
                    active
                      ? "border-ink text-ink"
                      : "border-transparent text-ink-meta hover:text-ink-lead hover:border-ink-meta hover:bg-paper-hover",
                  ].join(" ")}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

        </div>
      </header>

      {/* ── Search + quick-range chips ──────────────────────────────────────── */}
      <div className="bg-white border-b border-paper-rule">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 py-3">
            <div className="nyt-search sm:max-w-xs w-full">
              <SearchBar value={search} onChange={setSearch} placeholder="Search articles…" />
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <QuickChips active={filters.quickRange} onChange={handleQuickRange} />
              {!loading && (
                <span className="text-[11px] text-ink-muted tabular-nums">
                  {total} {total !== 1 ? "articles" : "article"}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">

        <FilterBar
          filters={filters}
          outlets={outlets}
          onChange={handleFilterChange}
          className="mb-5"
        />

        {loading && articles.length === 0 ? (
          <DashboardSkeleton />
        ) : dateKeys.length === 0 ? (
          <EmptyState search={search} filters={filters} />
        ) : (
          <div>
            {dateKeys.map((dateKey) => (
              <DaySection
                key={dateKey}
                dateKey={dateKey}
                articles={grouped.get(dateKey)!}
              />
            ))}

            {hasMore && (
              <div className="flex justify-center py-8">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="flex items-center gap-2 border border-ink-meta px-8 h-9 text-[11px] font-sans font-medium uppercase tracking-widest text-ink-meta hover:border-ink hover:text-ink transition-colors disabled:opacity-40"
                >
                  <RefreshCw className={loading ? "h-3 w-3 animate-spin" : "h-3 w-3"} />
                  Load more
                </button>
              </div>
            )}
          </div>
        )}

      </main>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-paper-rule mt-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 text-center">
          <p className="text-[11px] font-sans text-ink-meta">
            Brought to you by the{" "}
            <a
              href="https://californiagamingassociation.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink-lead hover:text-ink underline-offset-2 no-underline hover:underline transition-colors"
            >
              California Gaming Association
            </a>
          </p>
        </div>
      </footer>

    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="animate-pulse">
      {[0, 1].map((day) => (
        <div key={day} className="mb-10">
          <div className="flex items-center gap-3 mb-1 py-3 border-t border-paper-rule">
            <div className="h-px flex-1 bg-paper-rule" />
            <div className="h-2.5 w-32 bg-paper-rule rounded" />
            <div className="h-px flex-1 bg-paper-rule" />
          </div>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="py-5 border-b border-paper-rule flex gap-4">
              <div className="flex-1 space-y-2.5">
                <div className="h-2 w-20 bg-paper-hover rounded" />
                <div className="h-5 w-3/4 bg-paper-hover rounded" />
                <div className="h-3 w-full bg-paper-hover rounded" />
                <div className="h-3 w-5/6 bg-paper-hover rounded" />
              </div>
              <div className="shrink-0 w-28 h-20 bg-paper-hover rounded-sm" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ search, filters }: { search: string; filters: DashboardFilters }) {
  const hasFilters = search || Object.values(filters).some(Boolean);
  return (
    <div className="text-center py-24 border-t border-paper-rule">
      <p className="font-serif text-2xl font-bold text-ink mb-2">
        {hasFilters ? "No matching articles" : "No articles yet"}
      </p>
      <p className="text-sm text-ink-meta max-w-xs mx-auto leading-relaxed">
        {hasFilters
          ? "Try adjusting your search or filters."
          : "Articles will appear here once approved by an editor."}
      </p>
    </div>
  );
}
