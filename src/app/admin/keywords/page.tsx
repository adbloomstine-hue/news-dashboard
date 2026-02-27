"use client";

import React from "react";
import {
  Plus, Trash2, Pencil, Check, X, ToggleLeft, ToggleRight, Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/use-toast";

interface Keyword {
  id:        string;
  term:      string;
  enabled:   boolean;
  createdAt: string;
  updatedAt: string;
}

export default function KeywordsPage() {
  const [keywords,    setKeywords]    = React.useState<Keyword[]>([]);
  const [loading,     setLoading]     = React.useState(true);
  const [newTerm,     setNewTerm]     = React.useState("");
  const [adding,      setAdding]      = React.useState(false);
  const [editingId,   setEditingId]   = React.useState<string | null>(null);
  const [editTerm,    setEditTerm]    = React.useState("");
  const [savingId,    setSavingId]    = React.useState<string | null>(null);
  const [deletingId,  setDeletingId]  = React.useState<string | null>(null);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  async function fetchKeywords() {
    setLoading(true);
    try {
      const res  = await fetch("/api/admin/keywords");
      const data = await res.json();
      setKeywords(Array.isArray(data) ? data : []);
    } catch {
      toast({ variant: "error", title: "Failed to load keywords" });
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { fetchKeywords(); }, []);

  // ── Add ───────────────────────────────────────────────────────────────────
  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const term = newTerm.trim();
    if (!term) return;

    setAdding(true);
    try {
      const res = await fetch("/api/admin/keywords", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ term, enabled: true }),
      });

      let data: Record<string, unknown> = {};
      try { data = await res.json(); } catch { /* non-JSON response */ }

      if (!res.ok) {
        toast({
          variant:     "error",
          title:       "Failed to add keyword",
          description: (data.error as string) ?? `HTTP ${res.status}`,
        });
        return;
      }

      setKeywords((prev) => [data as unknown as Keyword, ...prev]);
      setNewTerm("");
      toast({ variant: "success", title: "Keyword added", description: term });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({ variant: "error", title: "Failed to add keyword", description: msg });
    } finally {
      setAdding(false);
    }
  }

  // ── Toggle enabled ────────────────────────────────────────────────────────
  async function handleToggle(kw: Keyword) {
    setSavingId(kw.id);
    try {
      const res = await fetch(`/api/admin/keywords/${kw.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ enabled: !kw.enabled }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ variant: "error", title: data.error ?? "Failed to update keyword" });
        return;
      }
      setKeywords((prev) => prev.map((k) => (k.id === kw.id ? data : k)));
    } catch {
      toast({ variant: "error", title: "Failed to update keyword" });
    } finally {
      setSavingId(null);
    }
  }

  // ── Edit (inline) ─────────────────────────────────────────────────────────
  function startEdit(kw: Keyword) {
    setEditingId(kw.id);
    setEditTerm(kw.term);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditTerm("");
  }

  async function saveEdit(kw: Keyword) {
    const term = editTerm.trim();
    if (!term || term === kw.term) { cancelEdit(); return; }

    setSavingId(kw.id);
    try {
      const res = await fetch(`/api/admin/keywords/${kw.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ term }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ variant: "error", title: data.error ?? "Failed to save keyword" });
        return;
      }
      setKeywords((prev) => prev.map((k) => (k.id === kw.id ? data : k)));
      cancelEdit();
      toast({ variant: "success", title: "Keyword updated" });
    } catch {
      toast({ variant: "error", title: "Failed to save keyword" });
    } finally {
      setSavingId(null);
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  async function handleDelete(kw: Keyword) {
    if (!confirm(`Delete keyword "${kw.term}"? This cannot be undone.`)) return;

    setDeletingId(kw.id);
    try {
      const res = await fetch(`/api/admin/keywords/${kw.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        toast({ variant: "error", title: data.error ?? "Failed to delete keyword" });
        return;
      }
      setKeywords((prev) => prev.filter((k) => k.id !== kw.id));
      toast({ variant: "success", title: "Keyword deleted", description: kw.term });
    } catch {
      toast({ variant: "error", title: "Failed to delete keyword" });
    } finally {
      setDeletingId(null);
    }
  }

  const active   = keywords.filter((k) => k.enabled);
  const inactive = keywords.filter((k) => !k.enabled);

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Tag className="h-5 w-5 text-brand-400" />
          Keyword Management
        </h1>
        <p className="text-sm text-[--text-muted] mt-1">
          Keywords are matched against RSS feed articles during ingestion. Only enabled keywords
          are active — disabling a keyword stops new articles from matching it without deleting it.
        </p>
      </div>

      {/* ── Active count summary ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-surface-raised border border-surface-border text-sm">
        <span className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold">
          <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block" />
          {active.length} active
        </span>
        {inactive.length > 0 && (
          <>
            <span className="text-[--text-muted]">·</span>
            <span className="text-[--text-muted]">{inactive.length} disabled</span>
          </>
        )}
        <span className="text-[--text-muted] ml-auto">
          {keywords.length} total
        </span>
      </div>

      {/* ── Add new keyword ──────────────────────────────────────────────────── */}
      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="text"
          value={newTerm}
          onChange={(e) => setNewTerm(e.target.value)}
          placeholder="Add a new keyword or phrase…"
          className="flex-1 bg-surface-raised border border-surface-border rounded-lg px-3 py-2 text-sm text-white placeholder-[--text-muted] focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50"
          disabled={adding}
        />
        <Button
          type="submit"
          size="sm"
          variant="default"
          disabled={adding || !newTerm.trim()}
          className="gap-1.5 shrink-0"
        >
          <Plus className="h-4 w-4" />
          {adding ? "Adding…" : "Add"}
        </Button>
      </form>

      {/* ── Keyword list ─────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-11 rounded-lg bg-surface-raised border border-surface-border animate-pulse" />
          ))}
        </div>
      ) : keywords.length === 0 ? (
        <p className="text-sm text-[--text-muted] text-center py-8">No keywords yet.</p>
      ) : (
        <div className="space-y-1.5">
          {keywords.map((kw) => {
            const isEditing  = editingId === kw.id;
            const isSaving   = savingId  === kw.id;
            const isDeleting = deletingId === kw.id;

            return (
              <div
                key={kw.id}
                className={cn(
                  "flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-all",
                  kw.enabled
                    ? "bg-surface-raised border-surface-border"
                    : "bg-bg-muted border-surface-border opacity-60"
                )}
              >
                {/* Enabled / disabled indicator dot */}
                <span
                  className={cn(
                    "shrink-0 h-2 w-2 rounded-full",
                    kw.enabled ? "bg-emerald-400" : "bg-[--text-muted]"
                  )}
                />

                {/* Term — editable inline */}
                {isEditing ? (
                  <input
                    autoFocus
                    value={editTerm}
                    onChange={(e) => setEditTerm(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); saveEdit(kw); }
                      if (e.key === "Escape") cancelEdit();
                    }}
                    className="flex-1 bg-surface-raised border border-brand-500/50 rounded px-2 py-0.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-500/50"
                    disabled={isSaving}
                  />
                ) : (
                  <span
                    className={cn(
                      "flex-1 text-sm truncate",
                      kw.enabled ? "text-white" : "text-[--text-muted]"
                    )}
                  >
                    {kw.term}
                  </span>
                )}

                {/* Action buttons */}
                <div className="shrink-0 flex items-center gap-1">
                  {isEditing ? (
                    <>
                      <button
                        onClick={() => saveEdit(kw)}
                        disabled={isSaving}
                        title="Save"
                        className="p-1 rounded hover:bg-surface-border text-emerald-400 hover:text-emerald-300 transition-colors disabled:opacity-50"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={cancelEdit}
                        disabled={isSaving}
                        title="Cancel"
                        className="p-1 rounded hover:bg-surface-border text-[--text-muted] hover:text-white transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      {/* Toggle enabled */}
                      <button
                        onClick={() => handleToggle(kw)}
                        disabled={isSaving || isDeleting}
                        title={kw.enabled ? "Disable keyword" : "Enable keyword"}
                        className="p-1 rounded hover:bg-surface-border transition-colors disabled:opacity-50"
                      >
                        {kw.enabled
                          ? <ToggleRight className="h-4 w-4 text-emerald-400" />
                          : <ToggleLeft  className="h-4 w-4 text-[--text-muted]" />
                        }
                      </button>

                      {/* Edit */}
                      <button
                        onClick={() => startEdit(kw)}
                        disabled={isDeleting}
                        title="Edit keyword"
                        className="p-1 rounded hover:bg-surface-border text-[--text-muted] hover:text-white transition-colors disabled:opacity-50"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(kw)}
                        disabled={isDeleting}
                        title="Delete keyword"
                        className="p-1 rounded hover:bg-surface-border text-[--text-muted] hover:text-red-400 transition-colors disabled:opacity-50"
                      >
                        {isDeleting
                          ? <span className="text-[10px] text-[--text-muted]">…</span>
                          : <Trash2 className="h-3.5 w-3.5" />
                        }
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
