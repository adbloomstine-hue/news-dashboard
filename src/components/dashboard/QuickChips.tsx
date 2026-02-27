"use client";

import React from "react";
import { cn } from "@/lib/utils";
import type { DashboardFilters } from "@/types";

type ChipDef = {
  label: string;
  value: NonNullable<DashboardFilters["quickRange"]>;
};

const CHIPS: ChipDef[] = [
  { label: "Today",       value: "today"     },
  { label: "Yesterday",   value: "yesterday" },
  { label: "Last 7 days", value: "week"      },
];

interface QuickChipsProps {
  active?:  DashboardFilters["quickRange"];
  onChange: (range: DashboardFilters["quickRange"]) => void;
}

export function QuickChips({ active, onChange }: QuickChipsProps) {
  return (
    <div className="flex items-center gap-0" role="group" aria-label="Quick date filters">
      {CHIPS.map(({ label, value }, idx) => (
        <button
          key={value}
          onClick={() => onChange(active === value ? undefined : value)}
          className={cn(
            "h-7 px-3 text-[11px] font-sans font-medium uppercase tracking-widest border transition-colors duration-100 whitespace-nowrap",
            // Left border only on first chip to avoid double borders
            idx === 0 ? "border-r-0" : idx === CHIPS.length - 1 ? "border-l-0" : "border-x-0",
            "border-paper-rule",
            active === value
              ? "bg-ink text-white border-ink"
              : "bg-white text-ink-meta hover:text-ink hover:border-ink hover:underline underline-offset-2"
          )}
          style={{
            // Share left border with neighbour via outline trick
            borderLeft:  idx === 0 ? "1px solid" : "none",
            borderRight: idx === CHIPS.length - 1 ? "1px solid" : "none",
            borderTop:   "1px solid",
            borderBottom: "1px solid",
            borderColor: active === value ? "#121212" : "#E2E2E2",
          }}
          aria-pressed={active === value}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
