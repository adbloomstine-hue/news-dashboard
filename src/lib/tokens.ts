/**
 * Design Tokens — CGA News Dashboard
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  CGA Brand Palette — derived from the California Gaming Association     │
 * │  circular badge logo:                                                    │
 * │                                                                          │
 * │  • Deep teal/navy base  → bg.base, bg.muted, surface.*                  │
 * │  • Medium blue ring     → secondary (#1E6BC0)                            │
 * │  • Bright CA green      → brand.400 (#6EC21E) — PRIMARY ACCENT          │
 * │  • White typography     → text.primary (#E0EEF5)                         │
 * │  • Charcoal border      → surface.border (#1B4A61)                      │
 * │                                                                          │
 * │  LOGO SWAP (when the real PNG is available):                             │
 * │  1. Copy the PNG to /public/cga-logo.png                                 │
 * │  2. Set NEXT_PUBLIC_LOGO_PATH=/cga-logo.png in .env                     │
 * │  3. Set NEXT_PUBLIC_SITE_NAME=CGA News in .env                          │
 * │  4. The <Logo> component auto-detects and renders the PNG               │
 * └─────────────────────────────────────────────────────────────────────────┘
 */

export const tokens = {
  colors: {
    // ── CGA Green (primary accent — California green from logo) ──────────
    brand: {
      primary:  "#6EC21E",   // California green — main accent, CTAs
      hover:    "#5CB520",   // slightly darker on hover
      deep:     "#4C9A18",   // deep green for active borders
      gradient: "linear-gradient(135deg, #6EC21E 0%, #1E6BC0 100%)",
    },

    // ── CGA Blue (logo ring — secondary brand) ───────────────────────────
    secondary: {
      primary:  "#1E6BC0",   // medium blue ring
      hover:    "#2B7FD8",   // lighter blue on hover
      light:    "#5AAAE0",   // even lighter
      dark:     "#134E96",   // deep blue
    },

    // ── Backgrounds (teal-based, derived from logo's deep teal) ─────────
    bg: {
      base:  "#071D2A",   // main page background
      muted: "#041520",   // sidebar / muted areas
    },

    // ── Surfaces (teal layering — card, panel, modal depths) ────────────
    surface: {
      default:  "#0D2F42",   // card / panel bg
      raised:   "#114055",   // elevated card / hover bg
      overlay:  "#155268",   // modal / tooltip bg
      border:   "#1B4A61",   // dividers, input borders
      nav:      "#0A2535",   // navigation header / sidebar bg
    },

    // ── Text (cool-white with teal tint, high contrast on dark teal) ────
    text: {
      primary:   "#E0EEF5",   // main text — cool near-white
      secondary: "#8BB8CC",   // secondary — muted teal
      muted:     "#4A7A94",   // muted — dark teal
      onNav:     "#FFFFFF",   // text on nav/header
      link:      "#6EC21E",   // link color — CGA green
    },

    // ── Status (all harmonized with CGA palette) ─────────────────────────
    status: {
      approve:  "#5CB520",   // CGA green  → approve
      reject:   "#C04030",   // muted red  → reject (harmonized)
      manual:   "#C47A20",   // amber      → needs manual
      queued:   "#1E6BC0",   // CGA blue   → queued
      priority: "#7C5BA8",   // muted purple → priority
    },
  },

  typography: {
    fontDisplay: "Space Grotesk, system-ui, sans-serif",
    fontBody:    "Inter, system-ui, sans-serif",
    fontMono:    "JetBrains Mono, ui-monospace, monospace",

    scale: {
      "2xs": "0.625rem",  // 10px
      xs:    "0.75rem",   // 12px
      sm:    "0.875rem",  // 14px
      base:  "1rem",      // 16px
      lg:    "1.125rem",  // 18px
      xl:    "1.25rem",   // 20px
      "2xl": "1.5rem",    // 24px
      "3xl": "1.875rem",  // 30px
      "4xl": "2.25rem",   // 36px
    },
  },

  spacing: {
    px:  "1px",
    0.5: "0.125rem",
    1:   "0.25rem",
    2:   "0.5rem",
    3:   "0.75rem",
    4:   "1rem",
    6:   "1.5rem",
    8:   "2rem",
    12:  "3rem",
    16:  "4rem",
    24:  "6rem",
  },

  radius: {
    sm:   "0.375rem",   //  6px
    md:   "0.625rem",   // 10px
    lg:   "0.875rem",   // 14px — cards (rounded to match badge motif)
    xl:   "1rem",       // 16px — modals
    full: "9999px",     // circles / pills
  },

  shadows: {
    card:      "0 1px 3px 0 rgb(0 0 0 / 0.5), 0 1px 2px -1px rgb(0 0 0 / 0.5)",
    cardHover: "0 4px 20px 0 rgb(110 194 30 / 0.14), 0 1px 4px 0 rgb(0 0 0 / 0.3)",
    glow:      "0 0 20px rgb(110 194 30 / 0.28)",
    glowBlue:  "0 0 16px rgb(30 107 192 / 0.35)",
    modal:     "0 20px 60px 0 rgb(0 0 0 / 0.7)",
  },
} as const;

export type Tokens = typeof tokens;
