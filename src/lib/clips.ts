/**
 * Email-clips utilities: date formatting, plain-text and rich-text builders.
 */

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface ClipArticle {
  title: string;
  url: string;
  outlet: string;
  author: string; // "Staff Report" as fallback
  publishedAt: string; // ISO string
  snippet: string;
}

export interface ClipSection {
  heading: string;
  articles: ClipArticle[];
}

// ─── Date helpers ───────────────────────────────────────────────────────────────

/** Format a date as M/D (no leading zeroes). e.g. 3/11. Uses UTC to avoid timezone shifts. */
export function formatClipDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
}

/** Format today's date for the subject line. e.g. "March 11, 2026" */
export function formatSubjectDate(date?: Date): string {
  const d = date ?? new Date();
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ─── Plain-text builder (for mailto body) ───────────────────────────────────────

export function buildPlainTextClipsEmail(sections: ClipSection[]): string {
  const parts: string[] = [];

  for (const section of sections) {
    // Section heading
    parts.push(section.heading);
    parts.push("");

    for (let i = 0; i < section.articles.length; i++) {
      const a = section.articles[i];
      // Article title
      parts.push(a.title);
      // URL on its own line
      parts.push(a.url);
      // Outlet (Author) M/D: Snippet
      parts.push(
        `${a.outlet} (${a.author}) ${formatClipDate(a.publishedAt)}: ${a.snippet}`
      );
      // Blank line between entries
      if (i < section.articles.length - 1) {
        parts.push("");
      }
    }

    // Blank line between sections
    parts.push("");
  }

  return parts.join("\n").trimEnd();
}

// ─── Rich-text (HTML) builder (for clipboard copy) ──────────────────────────────

export function buildRichTextClipsHtml(sections: ClipSection[]): string {
  const lines: string[] = [];

  for (const section of sections) {
    // Section heading - bold
    lines.push(
      `<p style="margin:0 0 8px 0;font-size:14px;"><strong>${esc(section.heading)}</strong></p>`
    );

    for (let i = 0; i < section.articles.length; i++) {
      const a = section.articles[i];
      // Hyperlinked title
      lines.push(
        `<p style="margin:0;font-size:14px;"><a href="${esc(a.url)}" style="color:#6A5ACD;">${esc(a.title)}</a></p>`
      );
      // Outlet (Author) M/D: Snippet
      lines.push(
        `<p style="margin:0 0 12px 0;font-size:14px;"><strong>${esc(a.outlet)}</strong> (${esc(a.author)}) ${formatClipDate(a.publishedAt)}: ${esc(a.snippet)}</p>`
      );
    }
  }

  return lines.join("\n");
}

// ─── Mailto builder ─────────────────────────────────────────────────────────────

export function buildMailtoLink(sections: ClipSection[], subjectDate?: Date): string {
  const subject = `CGA Clips: ${formatSubjectDate(subjectDate)}`;
  const body = buildPlainTextClipsEmail(sections);
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
