"use client";

import React, { useState } from "react";
import Image from "next/image";
import { getFaviconUrl, stringToColor, getInitials } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface OutletIconProps {
  domain:  string;
  outlet:  string;
  size?:   "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  sm:  { px: 24, cls: "h-6 w-6 text-[10px]" },
  md:  { px: 32, cls: "h-8 w-8 text-xs"      },
  lg:  { px: 48, cls: "h-12 w-12 text-sm"    },
};

/**
 * Outlet icon: attempts to load a favicon; falls back to a
 * generated colored avatar with initials.
 */
export function OutletIcon({ domain, outlet, size = "md", className }: OutletIconProps) {
  const [failed, setFailed] = useState(false);
  const { px, cls } = sizes[size];
  const faviconUrl  = getFaviconUrl(domain);
  const bgColor     = stringToColor(outlet);
  const initials    = getInitials(outlet);

  // Fallback: circular avatar with initials — matches circular badge motif
  if (failed) {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-full font-display font-bold text-white shrink-0",
          "ring-1 ring-white/10",
          cls,
          className
        )}
        style={{ backgroundColor: bgColor }}
        title={outlet}
        aria-label={outlet}
      >
        {initials}
      </span>
    );
  }

  // Circular favicon container — ring-style indicator matches the badge motif
  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center rounded-full overflow-hidden shrink-0",
        "bg-surface-raised ring-1 ring-surface-border",
        cls,
        className
      )}
      title={outlet}
    >
      <Image
        src={faviconUrl}
        alt={outlet}
        width={px}
        height={px}
        className="object-contain p-1"
        onError={() => setFailed(true)}
        unoptimized // favicons are external — skip Next.js optimization
      />
    </div>
  );
}
