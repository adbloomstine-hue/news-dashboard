"use client";

import React, { useState } from "react";
import { PlusCircle, X, ExternalLink, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/lib/use-toast";
import { Toaster } from "@/components/ui/toaster";

interface FormState {
  title:         string;
  outlet:        string;
  outletDomain:  string;
  url:           string;
  publishedAt:   string;
  snippet:       string;
  manualSummary: string;
  tags:          string[];
  priority:      boolean;
  status:        "QUEUED" | "APPROVED" | "NEEDS_MANUAL";
}

const DEFAULT_FORM: FormState = {
  title:         "",
  outlet:        "",
  outletDomain:  "",
  url:           "",
  publishedAt:   new Date().toISOString().slice(0, 16),
  snippet:       "",
  manualSummary: "",
  tags:          [],
  priority:      false,
  status:        "QUEUED",
};

export default function ManualEntryPage() {
  const [form,     setForm]     = useState<FormState>(DEFAULT_FORM);
  const [tagInput, setTagInput] = useState("");
  const [saving,   setSaving]   = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // Auto-extract domain from URL
  function handleUrlChange(url: string) {
    update("url", url);
    try {
      const domain = new URL(url).hostname.replace(/^www\./, "");
      if (!form.outletDomain) update("outletDomain", domain);
    } catch { /* not a valid URL yet */ }
  }

  function addTag() {
    const t = tagInput.trim().toLowerCase();
    if (t && !form.tags.includes(t)) {
      update("tags", [...form.tags, t]);
    }
    setTagInput("");
  }

  function removeTag(tag: string) {
    update("tags", form.tags.filter((t) => t !== tag));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/queue", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          ...form,
          publishedAt: new Date(form.publishedAt).toISOString(),
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Submission failed");
      }

      const created = await res.json();
      setLastSaved(created.title);
      setForm(DEFAULT_FORM);
      setTagInput("");
      toast({
        variant:     "success",
        title:       "Article added",
        description: `"${created.title.slice(0, 60)}" added to queue`,
      });
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
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <Toaster />
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-[--text-primary]">
          Manual Article Entry
        </h1>
        <p className="text-sm text-[--text-secondary] mt-0.5">
          Add articles manually — required for paywalled sources.
        </p>
      </div>

      {/* Compliance notice */}
      <div className="flex items-start gap-3 bg-amber-950/50 border border-amber-800/50 rounded-xl p-4 text-amber-300 text-sm">
        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
        <div>
          <strong>Compliance reminder:</strong> Do not copy and paste copyrighted article text.
          Write an original summary in your own words. Always include the canonical source URL.
        </div>
      </div>

      {lastSaved && (
        <div className="bg-emerald-950/50 border border-emerald-800/50 rounded-xl px-4 py-3 text-emerald-300 text-sm">
          ✓ Saved: &ldquo;{lastSaved}&rdquo;
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 bg-surface rounded-xl border border-surface-border p-6">
        {/* URL — first because it auto-fills domain */}
        <Field label="Article URL *">
          <Input
            type="url"
            value={form.url}
            onChange={(e) => handleUrlChange(e.target.value)}
            placeholder="https://example.com/article"
            required
            leftIcon={<ExternalLink className="h-3.5 w-3.5" />}
          />
        </Field>

        {/* Title */}
        <Field label="Title *">
          <Input
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder="Article headline"
            required
            maxLength={500}
          />
        </Field>

        {/* Outlet */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Outlet Name *">
            <Input
              value={form.outlet}
              onChange={(e) => update("outlet", e.target.value)}
              placeholder="e.g. Los Angeles Times"
              required
            />
          </Field>
          <Field label="Outlet Domain *">
            <Input
              value={form.outletDomain}
              onChange={(e) => update("outletDomain", e.target.value)}
              placeholder="latimes.com"
              required
            />
          </Field>
        </div>

        {/* Published date */}
        <Field label="Published Date/Time *">
          <Input
            type="datetime-local"
            value={form.publishedAt}
            onChange={(e) => update("publishedAt", e.target.value)}
            required
            className="[color-scheme:dark]"
          />
        </Field>

        {/* Snippet */}
        <Field label="Snippet (from public summary or metadata)">
          <Textarea
            value={form.snippet}
            onChange={(e) => update("snippet", e.target.value)}
            placeholder="Short excerpt from a freely available summary — plain text only"
            rows={3}
            maxLength={600}
          />
        </Field>

        {/* Manual summary */}
        <Field label="Manual Summary (your own words — required for paywalled articles)">
          <Textarea
            value={form.manualSummary}
            onChange={(e) => update("manualSummary", e.target.value)}
            placeholder="Write 2–3 paragraphs summarizing the article in your own words. Do not reproduce copyrighted text verbatim."
            rows={8}
          />
          <p className="text-xs text-[--text-muted] mt-1">
            Plain text only. Do not reproduce copyrighted content verbatim.
          </p>
        </Field>

        {/* Tags */}
        <Field label="Tags">
          <div className="flex gap-2">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="Add a tag and press Enter"
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
              maxLength={50}
            />
            <Button type="button" variant="secondary" size="sm" onClick={addTag}>
              Add
            </Button>
          </div>
          {form.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {form.tags.map((tag) => (
                <Badge key={tag} variant="muted" className="gap-1">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)}>
                    <X className="h-2.5 w-2.5" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </Field>

        {/* Status & Priority */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Initial Status">
            <select
              value={form.status}
              onChange={(e) => update("status", e.target.value as FormState["status"])}
              className="w-full h-9 rounded-lg border border-surface-border bg-surface-raised px-3 text-sm text-[--text-primary] focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="QUEUED">Queued (needs review)</option>
              <option value="APPROVED">Approved (publish immediately)</option>
              <option value="NEEDS_MANUAL">Needs Manual Summary</option>
            </select>
          </Field>

          <Field label="Priority">
            <div className="flex items-center gap-3 h-9">
              <button
                type="button"
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
              <span className="text-sm text-[--text-secondary]">Priority article</span>
            </div>
          </Field>
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={saving} className="flex-1">
            {saving ? (
              <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <PlusCircle className="h-4 w-4" />
            )}
            {saving ? "Saving…" : "Add Article"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setForm(DEFAULT_FORM)}
            disabled={saving}
          >
            Reset
          </Button>
        </div>
      </form>
    </div>
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
