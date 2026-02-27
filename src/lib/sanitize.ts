/**
 * HTML sanitization utilities.
 * Uses isomorphic-dompurify which works in both Node.js and browsers.
 * Prefer plain text rendering everywhere — this module strips all HTML
 * except a minimal safe set for summary display.
 */

import DOMPurify from "isomorphic-dompurify";

/** Strip ALL HTML — use for titles, outlet names, snippets. */
export function sanitizeText(input: string): string {
  if (!input) return "";
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}

/**
 * Allow a safe minimal subset of HTML — use only for rich summary fields
 * if needed. Strips scripts, iframes, events, and anything potentially
 * dangerous. All anchor links are forced to open in a new tab.
 */
export function sanitizeRichText(input: string): string {
  if (!input) return "";

  // Force all links to open in a new tab safely
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.tagName === "A") {
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer");
    }
  });

  const clean = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ["p", "br", "strong", "em", "ul", "ol", "li", "a"],
    ALLOWED_ATTR: ["href", "target", "rel"],
    FORCE_BODY: true,
  });

  DOMPurify.removeHooks("afterSanitizeAttributes");
  return clean;
}

/** Sanitize and truncate to a max character length. */
export function sanitizeAndTruncate(input: string, maxLength: number): string {
  const clean = sanitizeText(input);
  if (clean.length <= maxLength) return clean;
  return clean.slice(0, maxLength).trim() + "…";
}
