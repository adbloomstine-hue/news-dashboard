/**
 * Unit tests for the ingestion service.
 * Tests keyword matching, RSS parsing logic, and sanitization.
 */

import { describe, it, expect } from "vitest";
import { matchKeywords, hasKeywordMatch, TRACKED_KEYWORDS } from "../src/ingestion/keywords";
import { sanitizeText, sanitizeAndTruncate } from "../src/lib/sanitize";
import { parseJsonArray, getFaviconUrl, stringToColor, getInitials } from "../src/lib/utils";

// ─── Keyword matching ──────────────────────────────────────────────────────────

describe("matchKeywords", () => {
  it("matches exact keyword (case-insensitive)", () => {
    const result = matchKeywords("The California Gaming Association announced today");
    expect(result).toContain("California Gaming Association");
  });

  it("matches multiple keywords in the same text", () => {
    const result = matchKeywords(
      "California cardroom operators and California tribal casino representatives met"
    );
    expect(result).toContain("California cardroom");
    expect(result).toContain("California tribal casino");
  });

  it("matches case-insensitive", () => {
    expect(matchKeywords("KYLE KIRKLAND addressed the senate")).toContain("Kyle Kirkland");
    expect(matchKeywords("kyle kirkland spokesperson")).toContain("Kyle Kirkland");
  });

  it("matches SB 549 keyword", () => {
    const result = matchKeywords("SB 549 California bill moves forward");
    expect(result).toContain("SB 549 California");
  });

  it("returns empty array for unrelated text", () => {
    const result = matchKeywords("The weather in New York is sunny today");
    expect(result).toHaveLength(0);
  });

  it("returns empty array for empty string", () => {
    expect(matchKeywords("")).toHaveLength(0);
  });

  it("handles partial keyword matches correctly (no false positives)", () => {
    // "California" alone should NOT match "California Gaming Association" specifically
    const result = matchKeywords("California weather report for January");
    // Should not match "California Gaming Association" or "California Gaming Assn"
    expect(result).not.toContain("California Gaming Association");
    expect(result).not.toContain("California Gaming Assn");
  });

  it("matches California Sports betting", () => {
    const text = "Efforts to legalize California Sports betting face new hurdles";
    expect(matchKeywords(text)).toContain("California Sports betting");
  });

  it("matches California labor law", () => {
    expect(matchKeywords("New California labor law affects workers")).toContain("California labor law");
  });

  it("matches California wage law", () => {
    expect(matchKeywords("California wage law update for 2025")).toContain("California wage law");
  });
});

describe("hasKeywordMatch", () => {
  it("returns true when keyword is found", () => {
    expect(hasKeywordMatch("Kyle Kirkland spoke at the event")).toBe(true);
  });

  it("returns false for unrelated content", () => {
    expect(hasKeywordMatch("Stock markets rose sharply today")).toBe(false);
  });
});

describe("TRACKED_KEYWORDS", () => {
  it("contains all expected keywords", () => {
    expect(TRACKED_KEYWORDS).toContain("California Gaming Association");
    expect(TRACKED_KEYWORDS).toContain("California Gaming Assn");
    expect(TRACKED_KEYWORDS).toContain("Kyle Kirkland");
    expect(TRACKED_KEYWORDS).toContain("California cardroom");
    expect(TRACKED_KEYWORDS).toContain("California casino");
    expect(TRACKED_KEYWORDS).toContain("California tribal casino");
    expect(TRACKED_KEYWORDS).toContain("California gambling");
    expect(TRACKED_KEYWORDS).toContain("California Sports betting");
    expect(TRACKED_KEYWORDS).toContain("California wage law");
    expect(TRACKED_KEYWORDS).toContain("California labor law");
    expect(TRACKED_KEYWORDS).toContain("SB 549 California");
  });

  it("has 11 tracked keywords", () => {
    expect(TRACKED_KEYWORDS).toHaveLength(11);
  });
});

// ─── Sanitization ──────────────────────────────────────────────────────────────

describe("sanitizeText", () => {
  it("strips HTML tags", () => {
    expect(sanitizeText("<script>alert(1)</script>hello")).toBe("hello");
    expect(sanitizeText("<b>bold</b> text")).toBe("bold text");
    expect(sanitizeText("<p>paragraph</p>")).toBe("paragraph");
  });

  it("handles empty string", () => {
    expect(sanitizeText("")).toBe("");
  });

  it("strips XSS vectors", () => {
    expect(sanitizeText('<img src=x onerror="alert(1)">')).toBe("");
    expect(sanitizeText('<a href="javascript:void(0)">click</a>')).toBe("click");
  });

  it("preserves plain text", () => {
    const text = "California Gaming Association met in Sacramento on Tuesday.";
    expect(sanitizeText(text)).toBe(text);
  });
});

describe("sanitizeAndTruncate", () => {
  it("truncates text beyond maxLength", () => {
    const long = "a".repeat(600);
    const result = sanitizeAndTruncate(long, 100);
    expect(result.length).toBeLessThanOrEqual(103); // 100 + "…" (3 bytes)
    expect(result.endsWith("…")).toBe(true);
  });

  it("preserves short text", () => {
    const short = "Short text.";
    expect(sanitizeAndTruncate(short, 100)).toBe(short);
  });

  it("strips HTML before truncating", () => {
    const html = "<p>Hello world</p>";
    expect(sanitizeAndTruncate(html, 5)).toBe("Hello…");
  });
});

// ─── Utility functions ────────────────────────────────────────────────────────

describe("parseJsonArray", () => {
  it("parses a valid JSON array string", () => {
    expect(parseJsonArray('["foo","bar"]')).toEqual(["foo", "bar"]);
  });

  it("returns empty array for null/undefined", () => {
    expect(parseJsonArray(null)).toEqual([]);
    expect(parseJsonArray(undefined)).toEqual([]);
    expect(parseJsonArray("")).toEqual([]);
  });

  it("returns empty array for invalid JSON", () => {
    expect(parseJsonArray("{bad json}")).toEqual([]);
  });

  it("returns empty array for non-array JSON", () => {
    expect(parseJsonArray('{"key":"value"}')).toEqual([]);
  });

  it("handles empty array string", () => {
    expect(parseJsonArray("[]")).toEqual([]);
  });
});

describe("getFaviconUrl", () => {
  it("returns a valid Google favicon URL", () => {
    const url = getFaviconUrl("latimes.com");
    expect(url).toContain("google.com/s2/favicons");
    expect(url).toContain("latimes.com");
  });
});

describe("stringToColor", () => {
  it("returns a valid HSL color string", () => {
    const color = stringToColor("Los Angeles Times");
    expect(color).toMatch(/^hsl\(\d+, \d+%, \d+%\)$/);
  });

  it("returns consistent color for the same string", () => {
    const a = stringToColor("Test Outlet");
    const b = stringToColor("Test Outlet");
    expect(a).toBe(b);
  });

  it("returns different colors for different strings", () => {
    const a = stringToColor("Outlet A");
    const b = stringToColor("Outlet B");
    expect(a).not.toBe(b);
  });
});

describe("getInitials", () => {
  it("extracts initials from multi-word names", () => {
    expect(getInitials("Los Angeles Times")).toBe("LA");
    expect(getInitials("Sacramento Bee")).toBe("SB");
    expect(getInitials("Legal Sports Report")).toBe("LS"); // max 2
  });

  it("handles single-word names (returns single initial)", () => {
    // Single word → one initial
    expect(getInitials("KQED")).toBe("K");
    expect(getInitials("CalMatters")).toBe("C");
  });

  it("handles empty string gracefully", () => {
    expect(getInitials("")).toBe("");
  });

  it("result is always uppercase", () => {
    const result = getInitials("calmatters news");
    expect(result).toBe(result.toUpperCase());
  });
});
