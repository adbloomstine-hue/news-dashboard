import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Button — CGA brand variants
 * default:     CGA California green  — primary CTA
 * secondary:   CGA blue ring         — secondary actions
 * ghost:       Transparent           — subtle / tertiary
 * approve:     Green tinted          — approve queue items
 * reject:      Muted red tinted      — reject queue items (harmonized with palette)
 * destructive: Solid red             — destructive actions
 * outline:     Border only           — neutral alternative
 * link:        Green text link       — inline text links
 */
const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium",
    "transition-all duration-150",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400",
    "focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base",
    "disabled:pointer-events-none disabled:opacity-40 active:scale-[0.97]",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-brand-500 text-white hover:bg-brand-400 shadow-sm hover:shadow-glow",
        secondary:
          "bg-[#1B5FAF] text-white hover:bg-[#1E6BC0] shadow-sm hover:shadow-glow-blue",
        ghost:
          "text-[--text-secondary] hover:text-[--text-primary] hover:bg-surface-raised",
        approve:
          "bg-brand-500/15 text-brand-400 border border-brand-500/30 hover:bg-brand-500/25 hover:border-brand-400",
        reject:
          "bg-red-800/20 text-red-400 border border-red-700/30 hover:bg-red-700/30 hover:border-red-500",
        destructive:
          "bg-red-700 text-white hover:bg-red-600",
        outline:
          "border border-surface-border bg-transparent hover:bg-surface-raised text-[--text-secondary] hover:text-[--text-primary] hover:border-brand-600/40",
        link:
          "text-brand-400 underline-offset-4 hover:underline hover:text-brand-300 p-0 h-auto",
      },
      size: {
        sm:        "h-8  px-3 text-xs",
        default:   "h-9  px-4 py-2",
        lg:        "h-11 px-6 text-base",
        icon:      "h-9  w-9  p-0",
        "icon-sm": "h-7  w-7  p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size:    "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
