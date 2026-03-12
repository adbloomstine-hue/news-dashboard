/**
 * Unit tests for email-clips utilities.
 */

import { describe, it, expect } from "vitest";
import {
  formatClipDate,
  formatSubjectDate,
  buildPlainTextClipsEmail,
  buildRichTextClipsHtml,
  buildMailtoLink,
} from "../src/lib/clips";
import type { ClipSection } from "../src/lib/clips";

// ─── formatClipDate ──────────────────────────────────────────────────────────

describe("formatClipDate", () => {
  it("formats a date as M/D without leading zeroes", () => {
    expect(formatClipDate("2026-03-11T12:00:00Z")).toBe("3/11");
  });

  it("handles single-digit month and day", () => {
    expect(formatClipDate("2026-01-05T12:00:00Z")).toBe("1/5");
  });

  it("handles December 31", () => {
    expect(formatClipDate("2026-12-31T12:00:00Z")).toBe("12/31");
  });

  it("accepts Date objects", () => {
    const d = new Date(2026, 2, 10); // March 10
    expect(formatClipDate(d)).toBe("3/10");
  });
});

// ─── formatSubjectDate ───────────────────────────────────────────────────────

describe("formatSubjectDate", () => {
  it("formats as Month Day, Year", () => {
    const result = formatSubjectDate(new Date(2026, 2, 11));
    expect(result).toBe("March 11, 2026");
  });

  it("uses current date if none provided", () => {
    const result = formatSubjectDate();
    expect(result).toMatch(/\w+ \d{1,2}, \d{4}/);
  });
});

// ─── buildPlainTextClipsEmail ────────────────────────────────────────────────

const singleSection: ClipSection[] = [
  {
    heading: "California Cardrooms",
    articles: [
      {
        title: "Card rooms fight new regulations",
        url: "https://example.com/article1",
        outlet: "The Fresno Bee",
        author: "Bryant-Jon Anteloa",
        publishedAt: "2026-03-10T12:00:00Z",
        snippet:
          "The fight to keep blackjack games at licensed cardrooms intensified this week.",
      },
    ],
  },
];

const multiSection: ClipSection[] = [
  {
    heading: "California Cardrooms",
    articles: [
      {
        title: "Article One",
        url: "https://example.com/1",
        outlet: "Outlet A",
        author: "Author A",
        publishedAt: "2026-03-10T12:00:00Z",
        snippet: "Snippet for article one.",
      },
      {
        title: "Article Two",
        url: "https://example.com/2",
        outlet: "Outlet B",
        author: "Staff Report",
        publishedAt: "2026-03-10T12:00:00Z",
        snippet: "Snippet for article two.",
      },
    ],
  },
  {
    heading: "California Sports Betting",
    articles: [
      {
        title: "Sports Betting Update",
        url: "https://example.com/3",
        outlet: "Outlet C",
        author: "Author C",
        publishedAt: "2026-03-11T12:00:00Z",
        snippet: "Snippet for sports betting article.",
      },
    ],
  },
];

describe("buildPlainTextClipsEmail", () => {
  it("formats a single article correctly", () => {
    const result = buildPlainTextClipsEmail(singleSection);
    const lines = result.split("\n");
    expect(lines[0]).toBe("California Cardrooms");
    expect(lines[1]).toBe("");
    expect(lines[2]).toBe("Card rooms fight new regulations");
    expect(lines[3]).toBe("https://example.com/article1");
    expect(lines[4]).toContain("The Fresno Bee (Bryant-Jon Anteloa) 3/10:");
    expect(lines[4]).toContain("blackjack games");
  });

  it("separates multiple articles with blank lines", () => {
    const result = buildPlainTextClipsEmail(multiSection);
    const lines = result.split("\n");

    // First section heading
    expect(lines[0]).toBe("California Cardrooms");
    expect(lines[1]).toBe("");

    // Find blank line between first two articles
    const article1End = lines.indexOf(
      "Outlet A (Author A) 3/10: Snippet for article one."
    );
    expect(article1End).toBeGreaterThan(0);
    expect(lines[article1End + 1]).toBe("");

    // Second section
    expect(result).toContain("California Sports Betting");
    expect(result).toContain("Sports Betting Update");
  });

  it("includes URL on its own line below the title", () => {
    const result = buildPlainTextClipsEmail(singleSection);
    const lines = result.split("\n");
    const titleIdx = lines.indexOf("Card rooms fight new regulations");
    expect(lines[titleIdx + 1]).toBe("https://example.com/article1");
  });

  it("does not use bullets or m-dashes", () => {
    const result = buildPlainTextClipsEmail(multiSection);
    expect(result).not.toContain("- ");
    expect(result).not.toContain("* ");
    expect(result).not.toContain("\u2014");
    expect(result).not.toContain("\u2013");
  });
});

// ─── buildRichTextClipsHtml ──────────────────────────────────────────────────

describe("buildRichTextClipsHtml", () => {
  it("wraps section heading in bold", () => {
    const html = buildRichTextClipsHtml(singleSection);
    expect(html).toContain("<strong>California Cardrooms</strong>");
  });

  it("creates a hyperlinked title", () => {
    const html = buildRichTextClipsHtml(singleSection);
    expect(html).toContain('href="https://example.com/article1"');
    expect(html).toContain(">Card rooms fight new regulations</a>");
  });

  it("bolds the outlet name", () => {
    const html = buildRichTextClipsHtml(singleSection);
    expect(html).toContain("<strong>The Fresno Bee</strong>");
  });

  it("includes author in parentheses", () => {
    const html = buildRichTextClipsHtml(singleSection);
    expect(html).toContain("(Bryant-Jon Anteloa)");
  });

  it("includes M/D date format", () => {
    const html = buildRichTextClipsHtml(singleSection);
    expect(html).toContain("3/10:");
  });
});

// ─── buildMailtoLink ─────────────────────────────────────────────────────────

describe("buildMailtoLink", () => {
  it("starts with mailto:", () => {
    const link = buildMailtoLink(singleSection, new Date(2026, 2, 11));
    expect(link).toMatch(/^mailto:\?/);
  });

  it("includes correct subject line", () => {
    const link = buildMailtoLink(singleSection, new Date(2026, 2, 11));
    expect(link).toContain(
      `subject=${encodeURIComponent("CGA Clips: March 11, 2026")}`
    );
  });

  it("encodes the body", () => {
    const link = buildMailtoLink(singleSection, new Date(2026, 2, 11));
    expect(link).toContain("body=");
    // Body should be URI-encoded (no raw newlines)
    const bodyParam = link.split("body=")[1];
    expect(bodyParam).not.toContain("\n");
  });

  it("body contains the section heading when decoded", () => {
    const link = buildMailtoLink(singleSection, new Date(2026, 2, 11));
    const bodyParam = link.split("body=")[1];
    const decoded = decodeURIComponent(bodyParam);
    expect(decoded).toContain("California Cardrooms");
  });
});
