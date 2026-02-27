"use client";

import React from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  value:       string;
  onChange:    (value: string) => void;
  placeholder?: string;
  className?:  string;
}

export function SearchBar({
  value,
  onChange,
  placeholder = "Search articles…",
  className,
}: SearchBarProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div className={cn("relative flex items-center w-full", className)}>
      <span className="absolute left-2.5 text-ink-muted pointer-events-none">
        <Search className="h-3.5 w-3.5" />
      </span>
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-8 pl-8 pr-8 border border-paper-rule bg-white text-[13px] text-ink placeholder:text-ink-muted font-sans focus:outline-none focus:border-ink transition-colors"
        style={{ borderRadius: 0 }}
      />
      {value && (
        <button
          onClick={() => { onChange(""); inputRef.current?.focus(); }}
          className="absolute right-2.5 text-ink-muted hover:text-ink transition-colors"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
