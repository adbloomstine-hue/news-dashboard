/**
 * Shared TypeScript types for the News Dashboard.
 */

// ─── Article Status & Source ──────────────────────────────────────────────────
export type ArticleStatus  = "QUEUED" | "APPROVED" | "REJECTED" | "NEEDS_MANUAL";
export type IngestSource   = "RSS" | "NEWS_API" | "MANUAL" | "URL";
export type ArticleSection = "cardrooms" | "tribal" | "gaming";

// ─── Core Article (as returned by API, with parsed arrays) ───────────────────
export interface Article {
  id:              string;
  title:           string;
  outlet:          string;
  outletDomain:    string;
  publishedAt:     string; // ISO string
  url:             string;
  keywordsMatched: string[];
  snippet:         string | null;
  manualSummary:   string | null;
  status:          ArticleStatus;
  priority:        boolean;
  tags:            string[];
  ingestSource:    IngestSource;
  imageUrl:        string | null;
  author:          string | null;
  section:         ArticleSection | null;
  createdAt:       string;
  updatedAt:       string;
}

// ─── Audit Log ────────────────────────────────────────────────────────────────
export interface AuditLogEntry {
  id:          string;
  articleId:   string | null;
  action:      string;
  actorEmail:  string;
  timestamp:   string;
  details:     Record<string, unknown>;
  article?: {
    title: string;
    outlet: string;
  } | null;
}

// ─── Dashboard Filters ────────────────────────────────────────────────────────
export interface DashboardFilters {
  search?:    string;
  outlet?:    string;
  from?:      string; // ISO date string
  to?:        string; // ISO date string
  priority?:  boolean;
  tag?:       string;
  quickRange?: "today" | "yesterday" | "week";
}

// ─── Admin Actions ────────────────────────────────────────────────────────────
export interface ArticleEditPayload {
  title?:         string;
  outlet?:        string;
  outletDomain?:  string;
  publishedAt?:   string;
  snippet?:       string;
  manualSummary?: string;
  tags?:          string[];
  priority?:      boolean;
  section?:       ArticleSection | null;
}

// ─── Ingestion ────────────────────────────────────────────────────────────────
export interface RawArticle {
  title:       string;
  url:         string;
  outlet:      string;
  outletDomain:string;
  publishedAt: Date;
  snippet?:    string;
  imageUrl?:   string;
  author?:     string;
  source:      IngestSource;
}

export interface IngestionResult {
  source:          string;
  /** Total items in the feed/response before keyword filtering */
  articlesRaw:     number;
  /** Items that matched at least one keyword */
  articlesFound:   number;
  articlesCreated: number;
  articlesDuped:   number;
  errors:          string[];
}

// ─── API Responses ────────────────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?:   T;
  error?:  string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items:      T[];
  total:      number;
  page:       number;
  pageSize:   number;
  hasMore:    boolean;
}
