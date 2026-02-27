/**
 * HTML sanitization utilities.
 *
 * Lightweight implementation that works in all environments including
 * Vercel serverless (no jsdom / DOMPurify dependency).
 */

// ─── HTML entity decoding ────────────────────────────────────────────────────

const ENTITY_MAP: Record<string, string> = {
  "&amp;":  "&",
  "&lt;":   "<",
  "&gt;":   ">",
  "&quot;": '"',
  "&#039;": "'",
  "&#39;":  "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

function decodeEntities(str: string): string {
  return str
    .replace(/&(?:amp|lt|gt|quot|apos|nbsp|#039|#39);/gi, (m) => ENTITY_MAP[m.toLowerCase()] ?? m)
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

// ─── Tag stripping ───────────────────────────────────────────────────────────

/**
 * Strip ALL HTML tags — use for titles, outlet names, snippets.
 * Decodes HTML entities so the result is clean plain text.
 */
export function sanitizeText(input: string): string {
  if (!input) return "";
  // Remove all tags, then decode entities, then collapse whitespace
  return decodeEntities(input.replace(/<[^>]*>/g, ""))
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Sanitize and truncate to a max character length.
 */
export function sanitizeAndTruncate(input: string, maxLength: number): string {
  const clean = sanitizeText(input);
  if (clean.length <= maxLength) return clean;
  return clean.slice(0, maxLength).trim() + "\u2026";
}
