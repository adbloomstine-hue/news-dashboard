import React from "react";
import { Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface KeywordChipProps {
  keyword:   string;
  className?: string;
}

// CGA green keyword chip — the primary accent usage across the dashboard
export function KeywordChip({ keyword, className }: KeywordChipProps) {
  return (
    <Badge variant="keyword" className={cn("gap-1", className)}>
      <Tag className="h-2.5 w-2.5 shrink-0 text-brand-400" aria-hidden />
      {keyword}
    </Badge>
  );
}

interface KeywordChipListProps {
  keywords:   string[];
  maxVisible?: number;
  className?: string;
}

export function KeywordChipList({ keywords, maxVisible = 3, className }: KeywordChipListProps) {
  const visible  = keywords.slice(0, maxVisible);
  const overflow = keywords.length - maxVisible;

  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {visible.map((kw) => (
        <KeywordChip key={kw} keyword={kw} />
      ))}
      {overflow > 0 && (
        <Badge variant="muted" className="text-[10px]">
          +{overflow} more
        </Badge>
      )}
    </div>
  );
}
