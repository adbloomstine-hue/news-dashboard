import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Badge — CGA brand colors
 * keyword:  CGA green chip  — matched keywords (primary accent)
 * default:  CGA blue tinted — generic badges
 * success:  CGA green       — success states
 * warning:  Amber           — warnings (harmonized)
 * danger:   Muted red       — danger (harmonized with palette)
 * muted:    Neutral surface — secondary info
 * purple:   Priority flag
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default:
          "bg-[#1E6BC0]/10 text-[#5AAAE0] border border-[#1E6BC0]/25",
        success:
          "bg-brand-400/10 text-brand-400 border border-brand-400/25",
        warning:
          "bg-amber-500/10 text-amber-400 border border-amber-500/20",
        danger:
          "bg-red-800/15 text-red-400 border border-red-700/25",
        purple:
          "bg-purple-600/10 text-purple-400 border border-purple-500/20",
        muted:
          "bg-surface-raised text-[--text-secondary] border border-surface-border",
        outline:
          "border border-surface-border text-[--text-secondary]",
        keyword:
          "bg-brand-500/10 text-brand-400 border border-brand-500/25 font-mono text-[10px]",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
