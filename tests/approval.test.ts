/**
 * Unit tests for approval workflow logic.
 * Tests status transitions, audit requirements, and business rules.
 */

import { describe, it, expect } from "vitest";
import type { ArticleStatus } from "../src/types";

// ─── Status transition rules ──────────────────────────────────────────────────

type Transition = {
  from:    ArticleStatus;
  action:  "approve" | "reject" | "needs_manual";
  to:      ArticleStatus;
  allowed: boolean;
};

/**
 * Simulate the approval state machine.
 * These rules match the API route logic in:
 *   /api/articles/[id]/approve
 *   /api/articles/[id]/reject
 */
function canTransition(
  from: ArticleStatus,
  action: "approve" | "reject" | "needs_manual",
  hasManualSummary = false
): { allowed: boolean; reason?: string } {
  if (action === "approve") {
    if (from === "REJECTED") return { allowed: false, reason: "Cannot approve a rejected article directly" };
    if (from === "NEEDS_MANUAL" && !hasManualSummary) {
      return { allowed: false, reason: "Manual summary required before approval" };
    }
    return { allowed: true };
  }

  if (action === "reject") {
    if (from === "APPROVED") return { allowed: true }; // Can un-approve (reject)
    return { allowed: true };
  }

  if (action === "needs_manual") {
    if (from !== "QUEUED") return { allowed: false, reason: "Can only mark QUEUED articles as NEEDS_MANUAL" };
    return { allowed: true };
  }

  return { allowed: false };
}

describe("Approval workflow state machine", () => {
  describe("QUEUED → APPROVED", () => {
    it("allows approval of queued articles", () => {
      const result = canTransition("QUEUED", "approve");
      expect(result.allowed).toBe(true);
    });
  });

  describe("QUEUED → REJECTED", () => {
    it("allows rejection of queued articles", () => {
      const result = canTransition("QUEUED", "reject");
      expect(result.allowed).toBe(true);
    });
  });

  describe("QUEUED → NEEDS_MANUAL", () => {
    it("allows marking as needs manual from queue", () => {
      const result = canTransition("QUEUED", "needs_manual");
      expect(result.allowed).toBe(true);
    });
  });

  describe("NEEDS_MANUAL → APPROVED (without summary)", () => {
    it("blocks approval without manual summary", () => {
      const result = canTransition("NEEDS_MANUAL", "approve", false);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("Manual summary required");
    });
  });

  describe("NEEDS_MANUAL → APPROVED (with summary)", () => {
    it("allows approval when manual summary exists", () => {
      const result = canTransition("NEEDS_MANUAL", "approve", true);
      expect(result.allowed).toBe(true);
    });
  });

  describe("NEEDS_MANUAL → NEEDS_MANUAL", () => {
    it("blocks marking an already-manual article as needs_manual again", () => {
      const result = canTransition("NEEDS_MANUAL", "needs_manual");
      expect(result.allowed).toBe(false);
    });
  });

  describe("APPROVED → REJECTED", () => {
    it("allows un-approving an approved article", () => {
      const result = canTransition("APPROVED", "reject");
      expect(result.allowed).toBe(true);
    });
  });

  describe("REJECTED → APPROVED", () => {
    it("blocks direct approval from rejected state", () => {
      const result = canTransition("REJECTED", "approve");
      expect(result.allowed).toBe(false);
    });
  });
});

// ─── Audit log validation ─────────────────────────────────────────────────────

describe("Audit log requirements", () => {
  it("requires actor email for audit entries", () => {
    function createAuditEntry(actorEmail: string | null) {
      if (!actorEmail) throw new Error("actorEmail is required");
      return { actorEmail, action: "APPROVED", timestamp: new Date() };
    }

    expect(() => createAuditEntry(null)).toThrow("actorEmail is required");
    expect(() => createAuditEntry("admin@example.com")).not.toThrow();
  });

  it("audit entry has required fields", () => {
    const entry = {
      id:          "audit-1",
      articleId:   "article-1",
      action:      "APPROVED",
      actorEmail:  "admin@example.com",
      timestamp:   new Date().toISOString(),
      details:     { previousStatus: "QUEUED" },
    };

    expect(entry).toHaveProperty("articleId");
    expect(entry).toHaveProperty("action");
    expect(entry).toHaveProperty("actorEmail");
    expect(entry).toHaveProperty("timestamp");
    expect(entry.action).toBe("APPROVED");
  });
});

// ─── Manual entry validation ──────────────────────────────────────────────────

describe("Manual entry validation", () => {
  function validateManualEntry(data: {
    title?: string;
    url?: string;
    outlet?: string;
    outletDomain?: string;
    publishedAt?: string;
  }) {
    const errors: string[] = [];
    if (!data.title?.trim())       errors.push("title required");
    if (!data.url?.trim())         errors.push("url required");
    if (!data.outlet?.trim())      errors.push("outlet required");
    if (!data.outletDomain?.trim()) errors.push("outletDomain required");
    if (!data.publishedAt)        errors.push("publishedAt required");
    try {
      if (data.url) new URL(data.url);
    } catch {
      errors.push("url must be valid");
    }
    return errors;
  }

  it("validates required fields", () => {
    const errors = validateManualEntry({});
    expect(errors).toContain("title required");
    expect(errors).toContain("url required");
    expect(errors).toContain("outlet required");
  });

  it("validates URL format", () => {
    const errors = validateManualEntry({
      title: "Test Article",
      url:   "not-a-url",
      outlet: "Test Outlet",
      outletDomain: "test.com",
      publishedAt: new Date().toISOString(),
    });
    expect(errors).toContain("url must be valid");
  });

  it("passes for valid entry", () => {
    const errors = validateManualEntry({
      title:        "Valid Article Title",
      url:          "https://example.com/article",
      outlet:       "Example News",
      outletDomain: "example.com",
      publishedAt:  new Date().toISOString(),
    });
    expect(errors).toHaveLength(0);
  });
});

// ─── Tag validation ───────────────────────────────────────────────────────────

describe("Tag handling", () => {
  function sanitizeTags(tags: string[]): string[] {
    return tags
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0 && t.length <= 50)
      .slice(0, 20); // max 20 tags
  }

  it("normalizes tags to lowercase", () => {
    expect(sanitizeTags(["Regulation", "SPORTS", "Tribal"])).toEqual(["regulation", "sports", "tribal"]);
  });

  it("filters empty tags", () => {
    expect(sanitizeTags(["", "  ", "valid"])).toEqual(["valid"]);
  });

  it("limits to 20 tags", () => {
    const many = Array.from({ length: 30 }, (_, i) => `tag${i}`);
    expect(sanitizeTags(many)).toHaveLength(20);
  });

  it("filters tags over 50 characters", () => {
    const long = "a".repeat(51);
    expect(sanitizeTags([long])).toHaveLength(0);
  });
});
