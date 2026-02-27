"use client";

import React, { useState } from "react";
import { Save, X, Plus } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/lib/use-toast";
import { parseJsonArray } from "@/lib/utils";
import type { Article, ArticleEditPayload, ArticleSection } from "@/types";

interface EditArticleModalProps {
  article:  Article;
  open:     boolean;
  onClose:  () => void;
  onSaved:  (updated: Article) => void;
}

export function EditArticleModal({ article, open, onClose, onSaved }: EditArticleModalProps) {
  const [form, setForm] = useState<ArticleEditPayload>({
    title:         article.title,
    outlet:        article.outlet,
    outletDomain:  article.outletDomain,
    publishedAt:   article.publishedAt.slice(0, 16), // datetime-local format
    snippet:       article.snippet ?? "",
    manualSummary: article.manualSummary ?? "",
    tags:          parseJsonArray(article.tags as unknown as string),
    priority:      article.priority,
    section:       article.section ?? null,
  });
  const [tagInput, setTagInput]   = useState("");
  const [saving, setSaving]       = useState(false);

  function update<K extends keyof ArticleEditPayload>(key: K, value: ArticleEditPayload[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function addTag() {
    const t = tagInput.trim().toLowerCase();
    if (t && !(form.tags ?? []).includes(t)) {
      update("tags", [...(form.tags ?? []), t]);
    }
    setTagInput("");
  }

  function removeTag(tag: string) {
    update("tags", (form.tags ?? []).filter((t) => t !== tag));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/articles/${article.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          publishedAt: form.publishedAt ? new Date(form.publishedAt).toISOString() : undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Save failed");
      }
      const updated: Article = await res.json();
      onSaved(updated);
      onClose();
      toast({ variant: "success", title: "Article updated" });
    } catch (err) {
      toast({
        variant:     "error",
        title:       "Failed to save",
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Article</DialogTitle>
          <DialogDescription>
            Update metadata and add a manual summary for paywalled or incomplete articles.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4 space-y-4">
          {/* Title */}
          <Field label="Title">
            <Input
              value={form.title ?? ""}
              onChange={(e) => update("title", e.target.value)}
              placeholder="Article title"
            />
          </Field>

          {/* Outlet */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Outlet Name">
              <Input
                value={form.outlet ?? ""}
                onChange={(e) => update("outlet", e.target.value)}
                placeholder="e.g. Los Angeles Times"
              />
            </Field>
            <Field label="Outlet Domain">
              <Input
                value={form.outletDomain ?? ""}
                onChange={(e) => update("outletDomain", e.target.value)}
                placeholder="e.g. latimes.com"
              />
            </Field>
          </div>

          {/* Published date */}
          <Field label="Published Date/Time">
            <Input
              type="datetime-local"
              value={form.publishedAt ?? ""}
              onChange={(e) => update("publishedAt", e.target.value)}
              className="[color-scheme:dark]"
            />
          </Field>

          {/* Snippet */}
          <Field label="Snippet (public excerpt, auto-fetched or manual)">
            <Textarea
              value={form.snippet ?? ""}
              onChange={(e) => update("snippet", e.target.value)}
              placeholder="Short excerpt (plain text only)"
              rows={3}
              maxLength={600}
            />
          </Field>

          {/* Manual Summary */}
          <Field label="Manual Summary (required for paywalled articles)">
            <Textarea
              value={form.manualSummary ?? ""}
              onChange={(e) => update("manualSummary", e.target.value)}
              placeholder="2–3 paragraph summary of the article (plain text)"
              rows={6}
            />
            <p className="text-xs text-[--text-muted] mt-1">
              Plain text only. Write your own summary — do not reproduce copyrighted content verbatim.
            </p>
          </Field>

          {/* Section */}
          <Field label="News Section">
            <select
              value={form.section ?? ""}
              onChange={(e) =>
                update("section", (e.target.value || null) as ArticleSection | null)
              }
              className="w-full h-9 rounded-md border border-surface-border bg-surface px-3 text-sm text-[--text-primary] focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">General (shown on all pages)</option>
              <option value="cardrooms">California Cardroom News</option>
              <option value="tribal">California Tribal Casino News</option>
              <option value="gaming">California Gaming News</option>
            </select>
          </Field>

          {/* Tags */}
          <Field label="Tags">
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Add a tag…"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                className="flex-1"
              />
              <Button variant="secondary" size="sm" onClick={addTag}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            {(form.tags ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {(form.tags ?? []).map((tag) => (
                  <Badge key={tag} variant="muted" className="gap-1 cursor-pointer">
                    {tag}
                    <button onClick={() => removeTag(tag)} className="hover:text-[--text-primary]">
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </Field>

          {/* Priority */}
          <div className="flex items-center gap-3">
            <button
              role="switch"
              aria-checked={form.priority}
              onClick={() => update("priority", !form.priority)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full border-2 transition-colors ${
                form.priority ? "bg-purple-600 border-purple-500" : "bg-surface-overlay border-surface-border"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  form.priority ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <label className="text-sm text-[--text-secondary]">
              Mark as priority article
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-[--text-secondary]">{label}</label>
      {children}
    </div>
  );
}
