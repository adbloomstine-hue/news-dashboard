# Designer Notes — News Dashboard

## Visual System Overview

The design system is built on a **deep navy dark-mode aesthetic** with an electric blue primary palette. Everything is controlled through design tokens — a single source of truth for color, typography, spacing, radius, and shadow.

---

## How to Swap In Your Logo

### Step 1 — Add the logo file
Place your logo in `/public/`:
```
/public/logo.svg        ← preferred (vector, scales perfectly)
/public/logo.png        ← acceptable (use 2× resolution, minimum 320px wide)
```

### Step 2 — Set the environment variable
In your `.env`:
```
NEXT_PUBLIC_LOGO_PATH=/logo.svg
```
The `<Logo>` component in `src/components/shared/Logo.tsx` will automatically use it everywhere.

### Step 3 — Extract the palette
Use a tool like [imagecolorpicker.com](https://imagecolorpicker.com) or [coolors.co](https://coolors.co) to extract:
- **Primary color** (main CTA blue, link color, active states)
- **Secondary/accent** (supporting accent, gradients)
- **Optional: background/dark shade**

### Step 4 — Update design tokens
Edit these two files with your extracted values:

**`src/lib/tokens.ts`** — The canonical token object (used in code):
```ts
brand: {
  primary:   "#YOUR_PRIMARY",    // e.g. "#1a4fa8"
  secondary: "#YOUR_SECONDARY",  // e.g. "#2563eb"
  gradient:  "linear-gradient(135deg, #YOUR_PRIMARY 0%, #YOUR_SECONDARY 100%)",
},
```

**`tailwind.config.ts`** — The Tailwind palette (used in className strings):
```ts
brand: {
  // Replace all these shades with tints/shades of your primary color
  50:  "#...",
  100: "#...",
  // ... etc
  500: "#YOUR_PRIMARY",
  // ... etc
},
```

Use [uicolors.app](https://uicolors.app) to generate a full shade scale from a single hex color.

### Step 5 — Update the gradient background (optional)
In `globals.css`, the gradient orbs on the login page can be updated:
```css
/* Find and update these background colors */
bg-brand-600/10  →  bg-[#YOUR_PRIMARY]/10
bg-brand-secondary/10  →  bg-[#YOUR_SECONDARY]/10
```

---

## Typography System

| Token       | Font                    | Usage                              |
|-------------|-------------------------|------------------------------------|
| `font-display` | Space Grotesk (Google) | Headings, card titles, nav items |
| `font-sans`    | Inter (Google)          | Body text, UI labels, snippets   |
| `font-mono`    | System monospace        | Keyword chips, code              |

To change fonts:
1. Update `src/app/layout.tsx` — change the `next/font/google` imports
2. Update `tailwind.config.ts` → `theme.extend.fontFamily`
3. Update `src/lib/tokens.ts` → `typography.fontDisplay` / `typography.fontBody`

---

## Color System

### Base surfaces (dark navy)
```
bg-base:           #0A0E1A   ← Page background
bg-muted:          #0f1422   ← Sidebar backgrounds
surface:           #111827   ← Cards, panels
surface-raised:    #1A2235   ← Hover states, elevated elements
surface-overlay:   #1E2D45   ← Modals, tooltips
surface-border:    #243352   ← All borders and dividers
```

### Brand (electric blue — PLACEHOLDER)
```
brand-500:  #3B72F6   ← Primary actions, links (SWAP WITH LOGO COLOR)
brand-600:  #2555e0   ← Button backgrounds
brand-secondary: #6366F1  ← Gradients, secondary accents
```

### Status colors (semantic — do not change)
```
approve:   #10B981   ← Green checkmarks
reject:    #EF4444   ← Red X actions
manual:    #F59E0B   ← Amber "needs manual"
priority:  #A855F7   ← Purple star indicators
```

---

## Motion & Interaction

### Animations defined in `tailwind.config.ts`:
- `animate-fade-in` — cards entering the viewport (0.3s ease-out)
- `animate-slide-in` — sidebar items, queue entries
- `animate-shimmer` — loading skeleton shimmer effect
- `animate-pulse-slow` — live indicator dot

### Interaction principles:
1. **Cards** lift on hover with `shadow-card-hover` + slight border color shift
2. **Buttons** scale down slightly on press (`active:scale-[0.98]`)
3. **Queue items** fade in on load with a 50ms stagger per item
4. **Modals** use Radix dialog with zoom + fade transitions

---

## Component Structure

```
src/components/
├── ui/              ← Headless primitives (Button, Badge, Input, Dialog, Toast)
├── dashboard/       ← Public view (ArticleCard, DaySection, FilterBar, etc.)
├── admin/           ← Admin area (QueueItem, EditArticleModal, AdminNav, AuditLogTable)
└── shared/          ← Cross-cutting (Logo, OutletIcon, KeywordChip)
```

### OutletIcon
Fetches favicon via `https://www.google.com/s2/favicons?sz=64&domain_url=...`
Falls back to a generated colored avatar (deterministic color from outlet name + initials).

### KeywordChip
Displays tracked keyword matches with a tag icon in monospace font.
The `keyword` variant badge has a subtle blue tint and `font-mono` for visual distinction.

### ArticleCard
- Groups content into header (outlet meta) + body (snippet/summary) + footer (keywords + CTA)
- Priority articles get a purple left border: `border-l-2 border-l-purple-500`
- Hover state lifts the card with `shadow-card-hover`
- Long summaries collapse to 3 paragraphs with an expand toggle

---

## Layout Grid

| Context       | Max width | Side padding |
|---------------|-----------|--------------|
| Public dash   | `max-w-5xl` (1024px) | `px-4 sm:px-6` |
| Admin pages   | `max-w-4xl` (896px)  | `p-6` |
| Admin sidebar | `w-60` (240px) fixed | — |

---

## Responsive Breakpoints

- `sm` (640px+) — Filter grid switches to 2 columns; header shows full search
- `md` (768px+) — Article card titles increase font size
- `lg` (1024px+) — Filter grid switches to 3 columns

---

## Empty States

Every data view has a designed empty state with:
- Centered icon in a rounded box
- Descriptive heading
- Helpful subtext explaining why it's empty or what to do

---

## TODOs for Production

- [ ] **Swap logo** (see Step 1–5 above)
- [ ] **Swap brand color** in `tokens.ts` and `tailwind.config.ts`
- [ ] **Tighten CSP** — remove `unsafe-eval` from `script-src` in `next.config.ts` after testing
- [ ] **Swap rate limiter** — replace in-memory rate limiter in `src/lib/rate-limit.ts` with Upstash Redis for multi-instance deployments
- [ ] **Add pino-pretty as devDependency** — it's used for local dev logging
- [ ] **Set `CRON_SECRET`** in Vercel environment variables
- [ ] **Switch to PostgreSQL** for production (see README)
- [ ] **Add OpenGraph meta** to `src/app/layout.tsx` if the dashboard ever becomes semi-public
