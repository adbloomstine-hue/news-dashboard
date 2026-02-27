"use client";

/**
 * UrlFetchBar — "Add Article by URL" primary workflow component.
 *
 * Placed at the top of the admin queue. Admin pastes a URL, clicks Fetch,
 * and the app retrieves metadata and creates a queue entry automatically.
 */

import React, { useRef, useState } from "react";
import {
  Link2, Zap, AlertCircle, CheckCircle2, ShieldAlert, X,
} from "lucide-react";
import { Button }     from "@/components/ui/button";
import { Input }      from "@/components/ui/input";
import { Badge }      from "@/components/ui/badge";
import { toast }      from "@/lib/use-toast";
import { cn }         from "@/lib/utils";
import type { Article } from "@/types";

interface UrlFetchBarProps {
  onArticleFetched: (article: Article) => void;
}

type FetchState = "idle" | "loading" | "success" | "error";

interface FetchResult {
  article?:    Article;
  existingId?: string;
  error?:      string;
  isPaywalled?: boolean;
  isDuplicate?: boolean;
}

export function UrlFetchBar({ onArticleFetched }: UrlFetchBarProps) {
  const [url,           setUrl]           = useState("");
  const [fetchState,    setFetchState]    = useState<FetchState>("idle");
  const [result,        setResult]        = useState<FetchResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isLoading  = fetchState === "loading";
  const hasError   = fetchState === "error";
  const hasSuccess = fetchState === "success";

  async function handleFetch(e: React.FormEvent) {
    e.preventDefault();

    const trimmed = url.trim();
    if (!trimmed) {
      inputRef.current?.focus();
      return;
    }

    // Basic client-side URL guard before hitting the server
    try {
      const u = new URL(trimmed);
      if (u.protocol !== "http:" && u.protocol !== "https:") {
        setFetchState("error");
        setResult({ error: "Only http and https URLs are supported." });
        return;
      }
    } catch {
      setFetchState("error");
      setResult({ error: "That doesn't look like a valid URL." });
      return;
    }

    setFetchState("loading");
    setResult(null);

    try {
      const res = await fetch("/api/admin/articles/fetch-from-url", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ url: trimmed }),
      });

      const data = await res.json();

      if (res.status === 409) {
        // Already in the system
        setFetchState("error");
        setResult({ isDuplicate: true, error: "This URL is already in the system.", existingId: data.existingId, article: data.article });
        toast({ variant: "warning", title: "Already in queue", description: "This URL was previously added." });
        return;
      }

      if (!res.ok) {
        const msg = data.error ?? `Server error (${res.status})`;
        setFetchState("error");
        setResult({ error: msg });
        toast({ variant: "error", title: "Fetch failed", description: msg });
        return;
      }

      const article: Article = data;
      const isPaywalled = article.status === "NEEDS_MANUAL";

      setFetchState("success");
      setResult({ article, isPaywalled });
      onArticleFetched(article);

      toast({
        variant:     isPaywalled ? "warning" : "success",
        title:       isPaywalled ? "Added — manual summary needed" : "Article added to queue",
        description: article.title.slice(0, 80),
      });

      // Clear input after brief success flash
      setTimeout(() => {
        setUrl("");
        setFetchState("idle");
        setResult(null);
      }, 3000);
    } catch {
      setFetchState("error");
      setResult({ error: "Network error. Check your connection and try again." });
    }
  }

  function handleClear() {
    setUrl("");
    setFetchState("idle");
    setResult(null);
    inputRef.current?.focus();
  }

  return (
    <div
      className={cn(
        "relative rounded-xl border bg-surface p-4 transition-all duration-200",
        "border-l-2",
        hasError   ? "border-red-500/40  border-l-red-500"
        : hasSuccess ? "border-emerald-500/30 border-l-emerald-500"
        : "border-surface-border border-l-brand-500"
      )}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-3">
        <div
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-lg shrink-0 transition-colors",
            isLoading  ? "bg-brand-500/20 animate-pulse-slow"
            : hasError  ? "bg-red-500/15"
            : hasSuccess ? "bg-emerald-500/15"
            : "bg-brand-500/15"
          )}
        >
          {isLoading  ? <Zap     className="h-3.5 w-3.5 text-brand-400 animate-pulse" /> :
           hasError   ? <AlertCircle className="h-3.5 w-3.5 text-red-400" /> :
           hasSuccess ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> :
                        <Link2  className="h-3.5 w-3.5 text-brand-400" />}
        </div>

        <div className="flex-1 min-w-0">
          <h2 className="font-display text-sm font-semibold text-[--text-primary] leading-none">
            Add Article by URL
          </h2>
          <p className="text-xs text-[--text-muted] mt-0.5 truncate">
            Paste a link to auto-fetch title, outlet, date, and snippet
          </p>
        </div>

      </div>

      {/* ── URL Input + Fetch button ─────────────────────────────────── */}
      <form onSubmit={handleFetch} className="flex gap-2">
        <div className="relative flex-1">
          <Input
            ref={inputRef}
            type="url"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (fetchState !== "idle") { setFetchState("idle"); setResult(null); }
            }}
            onPaste={(e) => {
              // Auto-submit on paste if input was empty
              const pasted = e.clipboardData.getData("text").trim();
              if (!url.trim() && pasted.startsWith("http")) {
                e.preventDefault();
                setUrl(pasted);
                // Capture the DOM node synchronously — React nullifies e.currentTarget
                // after the handler returns, so accessing it inside requestAnimationFrame
                // would throw "null is not an object".
                const inputEl = e.currentTarget;
                requestAnimationFrame(() => {
                  const form = inputEl.closest("form");
                  form?.requestSubmit();
                });
              }
            }}
            placeholder="https://example.com/article/..."
            leftIcon={<Link2 className="h-3.5 w-3.5" />}
            disabled={isLoading}
            className={cn(
              "h-10 text-sm pr-8",
              hasError && !result?.isDuplicate && "border-red-500/60 focus-visible:ring-red-500"
            )}
            aria-label="Article URL"
            aria-invalid={hasError}
            autoComplete="off"
            spellCheck={false}
          />
          {url && !isLoading && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[--text-muted] hover:text-[--text-secondary] transition-colors"
              aria-label="Clear URL"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <Button
          type="submit"
          disabled={isLoading || !url.trim()}
          className="h-10 px-5 shrink-0 gap-2"
        >
          {isLoading ? (
            <>
              <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin shrink-0" />
              Fetching...
            </>
          ) : (
            <>
              <Zap className="h-3.5 w-3.5 shrink-0" />
              Fetch
            </>
          )}
        </Button>
      </form>

      {/* ── Status messages ──────────────────────────────────────────── */}
      {result && (
        <div className="mt-2.5 animate-fade-in">
          {/* Error */}
          {hasError && !result.isDuplicate && (
            <div className="flex items-start gap-2 text-xs text-red-400">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>{result.error}</span>
            </div>
          )}

          {/* Duplicate */}
          {hasError && result.isDuplicate && (
            <div className="flex items-center gap-2 text-xs text-amber-400">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{result.error}</span>
            </div>
          )}

          {/* Success — paywalled */}
          {hasSuccess && result.isPaywalled && result.article && (
            <div className="flex items-center gap-2 text-xs text-amber-400">
              <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
              <span>
                Added as <Badge variant="warning" className="text-[10px] mx-0.5">Needs Manual</Badge>
                {" "}— site appears paywalled. Open the Edit panel to add a summary before approving.
              </span>
            </div>
          )}

          {/* Success — normal */}
          {hasSuccess && !result.isPaywalled && result.article && (
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              <span>
                <span className="font-medium text-emerald-300 line-clamp-1">
                  {result.article.title}
                </span>
                {" "}added to queue.
                {result.article.keywordsMatched.length > 0 && (
                  <span className="text-[--text-muted] ml-1">
                    Matched {result.article.keywordsMatched.length} keyword{result.article.keywordsMatched.length !== 1 ? "s" : ""}.
                  </span>
                )}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
