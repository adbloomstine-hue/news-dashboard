/**
 * Logo component — CGA News Dashboard
 *
 * Renders the CGA circular badge logo.
 * When NEXT_PUBLIC_LOGO_PATH is set the real PNG/SVG is used;
 * otherwise the inline SVG badge (matching the CGA brand) is shown.
 *
 * LOGO SWAP:
 *   1. Copy the PNG to /public/cga-logo.png
 *   2. Set NEXT_PUBLIC_LOGO_PATH=/cga-logo.png in .env
 *   3. Done — the component picks it up automatically.
 */

import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?:     "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

const sizes = {
  sm: { px: 32,  text: "text-sm",  ringCls: "h-8  w-8"  },
  md: { px: 40,  text: "text-base", ringCls: "h-10 w-10" },
  lg: { px: 56,  text: "text-xl",  ringCls: "h-14 w-14" },
};

export function Logo({ size = "md", showText = true, className }: LogoProps) {
  const logoPath = process.env.NEXT_PUBLIC_LOGO_PATH;
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME ?? "CGA News";
  const { px, text, ringCls } = sizes[size];

  const badgeEl = logoPath ? (
    /* Real logo (PNG or SVG placed in /public/) */
    <div
      className={cn(
        "relative rounded-full overflow-hidden shrink-0",
        "ring-2 ring-[#1E6BC0]/40 hover:ring-brand-400/60",
        "shadow-[0_0_12px_rgba(30,107,192,0.25)]",
        "hover:shadow-[0_0_18px_rgba(30,107,192,0.4),0_0_8px_rgba(110,194,30,0.2)]",
        "transition-all duration-200 hover:scale-105",
        ringCls
      )}
    >
      <Image
        src={logoPath}
        alt={siteName}
        width={px}
        height={px}
        className="object-cover w-full h-full"
        priority
        unoptimized
      />
    </div>
  ) : (
    /* Inline CGA SVG badge — matches exact brand colors */
    <CgaBadge px={px} ringCls={ringCls} siteName={siteName} />
  );

  if (!showText) {
    return <div className={className}>{badgeEl}</div>;
  }

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      {badgeEl}
      <span className={cn("font-display font-bold tracking-tight text-[--text-on-nav]", text)}>
        {siteName}
      </span>
    </div>
  );
}

/* ─── Inline CGA badge SVG ───────────────────────────────────────────────── */

function CgaBadge({ px, ringCls, siteName }: { px: number; ringCls: string; siteName: string }) {
  return (
    <div
      className={cn(
        "relative rounded-full shrink-0 overflow-hidden cursor-default",
        "ring-2 ring-[#1E6BC0]/40 hover:ring-brand-400/60",
        "shadow-[0_0_12px_rgba(30,107,192,0.25)]",
        "hover:shadow-[0_0_18px_rgba(30,107,192,0.4),0_0_8px_rgba(110,194,30,0.2)]",
        "transition-all duration-200 hover:scale-105",
        ringCls
      )}
      title={siteName}
      aria-label={siteName}
    >
      <svg
        width={px}
        height={px}
        viewBox="0 0 120 120"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="cgaBgInline" cx="38%" cy="35%" r="70%">
            <stop offset="0%"   stopColor="#114055"/>
            <stop offset="100%" stopColor="#071D2A"/>
          </radialGradient>
          <radialGradient id="cgaHlInline" cx="30%" cy="25%" r="50%">
            <stop offset="0%"   stopColor="#1B6CA8" stopOpacity="0.35"/>
            <stop offset="100%" stopColor="#071D2A" stopOpacity="0"/>
          </radialGradient>
        </defs>
        <circle cx="60" cy="60" r="59"    fill="#041520"/>
        <circle cx="60" cy="60" r="55.5"  fill="none" stroke="#1E6BC0" strokeWidth="4.5"/>
        <circle cx="60" cy="60" r="52"    fill="url(#cgaBgInline)"/>
        <circle cx="60" cy="60" r="52"    fill="url(#cgaHlInline)"/>
        <path d="M 23 48 A 41 41 0 0 1 97 48"
              fill="none" stroke="#6EC21E" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M 23 72 A 41 41 0 0 0 97 72"
              fill="none" stroke="#6EC21E" strokeWidth="2.5" strokeLinecap="round"/>
        <text x="60" y="63"
              fontFamily="'Arial Black', Impact, Arial, Helvetica, sans-serif"
              fontSize="25" fontWeight="900" fill="#FFFFFF"
              textAnchor="middle" dominantBaseline="middle" letterSpacing="3">
          CGA
        </text>
        <text x="60" y="77"
              fontFamily="Arial, Helvetica, sans-serif"
              fontSize="5.5" fill="#5BB8D8"
              textAnchor="middle" letterSpacing="2" fontWeight="500">
          CALIFORNIA GAMING
        </text>
        <text x="60" y="86"
              fontFamily="Arial, Helvetica, sans-serif"
              fontSize="5.5" fill="#5BB8D8"
              textAnchor="middle" letterSpacing="2" fontWeight="500">
          ASSOCIATION
        </text>
        <circle cx="60"  cy="9.5"   r="2.5" fill="#6EC21E"/>
        <circle cx="108" cy="34.5"  r="2"   fill="#6EC21E"/>
        <circle cx="108" cy="85.5"  r="2"   fill="#6EC21E"/>
        <circle cx="60"  cy="110.5" r="2.5" fill="#6EC21E"/>
        <circle cx="12"  cy="85.5"  r="2"   fill="#6EC21E"/>
        <circle cx="12"  cy="34.5"  r="2"   fill="#6EC21E"/>
      </svg>
    </div>
  );
}
