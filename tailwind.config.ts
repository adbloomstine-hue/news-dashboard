import type { Config } from "tailwindcss";
import { fontFamily } from "tailwindcss/defaultTheme";

/**
 * Tailwind config — CGA brand palette
 *
 * All colors derive from the California Gaming Association logo:
 *   • Deep teal/navy   → bg.base / bg.muted / surface.*
 *   • Medium blue ring → secondary (#1E6BC0) — used for secondary buttons, links
 *   • California green → brand (40 = #6EC21E) — primary accent, CTAs, keywords
 *   • White text       → [--text-primary]
 *   • Charcoal border  → surface.border
 *
 * To swap in the real logo PNG once available:
 *   1. Place the PNG at /public/cga-logo.png
 *   2. Set NEXT_PUBLIC_LOGO_PATH=/cga-logo.png in .env
 *   3. The <Logo> component picks it up automatically.
 */

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx}",
    "./src/ingestion/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        // ── CGA Green (primary accent — California green from logo) ─────────
        brand: {
          50:  "#EEF9E0",
          100: "#D6F0AE",
          200: "#B8E879",
          300: "#92D843",
          400: "#6EC21E",  // PRIMARY ACCENT — California green
          500: "#5CB520",  // CTAs, focus rings
          600: "#4C9A18",  // deep green hover
          700: "#3D8014",
          800: "#2E6510",
          900: "#1F4B0C",
          950: "#0F2506",
        },

        // ── CGA Blue (logo ring — secondary brand) ────────────────────────
        secondary: {
          DEFAULT: "#1E6BC0",  // medium blue ring
          hover:   "#2B7FD8",
          light:   "#5AAAE0",
          dark:    "#134E96",
        },

        // ── Surfaces (teal-based — derived from logo's deep teal background) ─
        surface: {
          DEFAULT: "#0D2F42",   // card / panel bg
          raised:  "#114055",   // elevated card / hover bg
          overlay: "#155268",   // modal / tooltip bg
          border:  "#1B4A61",   // dividers, input borders
          nav:     "#0A2535",   // navigation header / sidebar bg
        },

        // ── Page backgrounds (darkest teal) ───────────────────────────────
        bg: {
          base:  "#071D2A",   // main page background
          muted: "#041520",   // sidebar / muted areas
        },

        // ── Status (all harmonized with the CGA palette) ──────────────────
        approve:  "#5CB520",   // CGA green  → approve action
        reject:   "#C04030",   // muted red  → reject action (harmonized, not pure red)
        manual:   "#C47A20",   // amber      → needs manual
        priority: "#7C5BA8",   // muted purple → priority flag

        // ── NYT-inspired editorial palette (public dashboard) ─────────────
        ink: {
          DEFAULT: "#121212",  // near-black — headlines
          lead:    "#333333",  // body / deck text
          meta:    "#6B6B6B",  // bylines, timestamps
          muted:   "#999999",  // secondary meta
        },
        paper: {
          DEFAULT: "#FFFFFF",  // white page background
          warm:    "#F7F7F5",  // faint warm-white tint
          rule:    "#E2E2E2",  // thin horizontal dividers
          hover:   "#F2F2F2",  // hover state background
        },
      },

      fontFamily: {
        sans:    ["var(--font-inter)",         ...fontFamily.sans],
        display: ["var(--font-space-grotesk)", ...fontFamily.sans],
        // Editorial serif — Playfair Display for public dashboard headlines
        serif:   ["var(--font-playfair)", "Georgia", "'Times New Roman'", "serif"],
        mono:    ["var(--font-mono)",          ...fontFamily.mono],
      },

      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "1rem" }],
      },

      borderRadius: {
        // Slightly more rounded to match the circular badge motif
        lg:  "0.875rem",  // 14px — cards
        md:  "0.625rem",  // 10px
        sm:  "0.375rem",  //  6px
        xl:  "1rem",      // 16px — modals
        "2xl": "1.25rem", // 20px — large cards
      },

      boxShadow: {
        // Green-tinted card shadow (logo-derived)
        card:      "0 1px 3px 0 rgb(0 0 0 / 0.5), 0 1px 2px -1px rgb(0 0 0 / 0.5)",
        "card-hover": "0 4px 20px 0 rgb(110 194 30 / 0.14), 0 1px 4px 0 rgb(0 0 0 / 0.3)",
        // Green glow — used on primary CTAs
        glow:      "0 0 20px rgb(110 194 30 / 0.28)",
        // Blue glow — secondary CTAs
        "glow-blue": "0 0 16px rgb(30 107 192 / 0.35)",
        // Modal shadow
        modal:     "0 20px 60px 0 rgb(0 0 0 / 0.7)",
        // Inset ring — for approve/reject flash
        "ring-green": "0 0 0 4px rgb(92 181 32 / 0.35)",
        "ring-red":   "0 0 0 4px rgb(192 64 48 / 0.35)",
      },

      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to:   { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to:   { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in": {
          from: { opacity: "0", transform: "translateX(-8px)" },
          to:   { opacity: "1", transform: "translateX(0)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0.5" },
        },
        // Approve action — green ring flash + scale bump
        "approve-flash": {
          "0%":   { transform: "scale(1)",    boxShadow: "0 0 0 0 rgba(92,181,32,0)" },
          "25%":  { transform: "scale(1.015)",boxShadow: "0 0 0 6px rgba(92,181,32,0.38)" },
          "65%":  { transform: "scale(0.99)", boxShadow: "0 0 0 3px rgba(92,181,32,0.15)" },
          "100%": { transform: "scale(1)",    boxShadow: "0 0 0 0 rgba(92,181,32,0)" },
        },
        // Reject action — red ring flash + scale bump
        "reject-flash": {
          "0%":   { transform: "scale(1)",    boxShadow: "0 0 0 0 rgba(192,64,48,0)" },
          "25%":  { transform: "scale(1.015)",boxShadow: "0 0 0 6px rgba(192,64,48,0.38)" },
          "65%":  { transform: "scale(0.99)", boxShadow: "0 0 0 3px rgba(192,64,48,0.15)" },
          "100%": { transform: "scale(1)",    boxShadow: "0 0 0 0 rgba(192,64,48,0)" },
        },
        // Subtle radial pulse for live indicator
        "radial-pulse": {
          "0%, 100%": { transform: "scale(1)",    opacity: "1" },
          "50%":      { transform: "scale(1.4)", opacity: "0.6" },
        },
      },

      animation: {
        "accordion-down":  "accordion-down 0.2s ease-out",
        "accordion-up":    "accordion-up 0.2s ease-out",
        "fade-in":         "fade-in 0.3s ease-out",
        "slide-in":        "slide-in 0.25s ease-out",
        shimmer:           "shimmer 2s linear infinite",
        "pulse-slow":      "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "approve-flash":   "approve-flash 0.55s ease-out forwards",
        "reject-flash":    "reject-flash 0.55s ease-out forwards",
        "radial-pulse":    "radial-pulse 2s ease-in-out infinite",
      },

      backgroundImage: {
        "shimmer-gradient":
          "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)",
        // Radial rings inspired by the circular badge logo geometry
        "radial-cga":
          "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(30,107,192,0.1) 0%, transparent 65%), " +
          "radial-gradient(ellipse 40% 40% at 85% 10%, rgba(110,194,30,0.06) 0%, transparent 50%), " +
          "radial-gradient(ellipse 40% 40% at 15% 90%, rgba(110,194,30,0.06) 0%, transparent 50%)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
