"use client";

import React from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardFilters } from "@/types";

interface FilterBarProps {
  filters:   DashboardFilters;
  outlets:   string[];
  onChange:  (filters: DashboardFilters) => void;
  className?: string;
}

export function FilterBar({ filters, outlets, onChange, className }: FilterBarProps) {
  const [open, setOpen] = React.useState(false);

  const activeCount = [
    filters.outlet, filters.from, filters.to, filters.priority, filters.tag,
  ].filter(Boolean).length;

  function clearAll() {
    onChange({});
  }

  const selectCls =
    "w-full h-8 border border-paper-rule bg-white px-2 text-[12px] text-ink font-sans focus:outline-none focus:border-ink transition-colors";

  const labelCls = "block text-[10px] font-sans font-bold uppercase tracking-widest text-ink-meta mb-1";

  return (
    <div className={cn(className)}>
      {/* Toggle row */}
      <div className="flex items-center gap-3 border-b border-paper-rule pb-3">
        <button
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "flex items-center gap-1.5 text-[11px] font-sans font-medium uppercase tracking-widest transition-colors",
            open ? "text-ink" : "text-ink-meta hover:text-ink"
          )}
        >
          <SlidersHorizontal className="h-3 w-3" />
          Filters
          {activeCount > 0 && (
            <span className="ml-1 inline-flex h-4 w-4 items-center justify-center bg-ink text-white text-[9px] font-bold rounded-full">
              {activeCount}
            </span>
          )}
        </button>

        {activeCount > 0 && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 text-[11px] font-sans text-ink-muted hover:text-ink transition-colors uppercase tracking-widest"
          >
            <X className="h-2.5 w-2.5" />
            Clear
          </button>
        )}

        {/* Active filter tags */}
        {activeCount > 0 && (
          <div className="flex gap-2 flex-wrap ml-2">
            {filters.outlet && (
              <ActiveTag label={filters.outlet} onRemove={() => onChange({ ...filters, outlet: undefined })} />
            )}
            {filters.from && (
              <ActiveTag label={`From ${filters.from}`} onRemove={() => onChange({ ...filters, from: undefined })} />
            )}
            {filters.to && (
              <ActiveTag label={`To ${filters.to}`} onRemove={() => onChange({ ...filters, to: undefined })} />
            )}
            {filters.priority && (
              <ActiveTag label="Priority" onRemove={() => onChange({ ...filters, priority: undefined })} />
            )}
          </div>
        )}
      </div>

      {/* Expanded filter panel */}
      {open && (
        <div className="bg-paper-warm border border-paper-rule border-t-0 px-4 py-4 animate-fade-in">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">

            {/* Outlet */}
            <div>
              <label className={labelCls}>Outlet</label>
              <select
                className={selectCls}
                value={filters.outlet ?? ""}
                onChange={(e) => onChange({ ...filters, outlet: e.target.value || undefined })}
              >
                <option value="">All outlets</option>
                {outlets.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>

            {/* From */}
            <div>
              <label className={labelCls}>From</label>
              <input
                type="date"
                className={cn(selectCls, "[color-scheme:light]")}
                value={filters.from ?? ""}
                onChange={(e) => onChange({ ...filters, from: e.target.value || undefined })}
              />
            </div>

            {/* To */}
            <div>
              <label className={labelCls}>To</label>
              <input
                type="date"
                className={cn(selectCls, "[color-scheme:light]")}
                value={filters.to ?? ""}
                onChange={(e) => onChange({ ...filters, to: e.target.value || undefined })}
              />
            </div>

            {/* Priority */}
            <div>
              <label className={labelCls}>Priority</label>
              <button
                onClick={() => onChange({ ...filters, priority: filters.priority ? undefined : true })}
                className={cn(
                  "flex items-center gap-1.5 h-8 px-2 w-full border text-[12px] font-sans transition-colors",
                  filters.priority
                    ? "bg-ink text-white border-ink"
                    : "bg-white text-ink-meta border-paper-rule hover:border-ink hover:text-ink"
                )}
              >
                {filters.priority ? "★ Priority only" : "All articles"}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

function ActiveTag({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      onClick={onRemove}
      className="inline-flex items-center gap-1 text-[10px] font-sans uppercase tracking-wider text-ink border border-ink px-1.5 py-0.5 hover:bg-ink hover:text-white transition-colors"
    >
      {label}
      <X className="h-2.5 w-2.5" />
    </button>
  );
}
