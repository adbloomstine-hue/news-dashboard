/**
 * RSS Ingestion Adapter (Adapter A)
 *
 * Fetches publicly available RSS feeds and parses articles.
 * Only stores metadata and short snippets — never fetches full article text
 * or bypasses paywalls.
 *
 * Compliant approach:
 * - Uses publicly available RSS feeds only
 * - Does not authenticate to third-party services
 * - Does not follow links to scrape full content
 * - Stores only what the RSS feed provides (title, link, description, pubDate)
 */

import { XMLParser } from "fast-xml-parser";
import { matchKeywords } from "../keywords";
import { sanitizeText, sanitizeAndTruncate } from "@/lib/sanitize";
import type { RawArticle } from "@/types";

interface RssFeedConfig {
  name:    string;
  url:     string;
  outlet:  string;
  domain:  string;
  enabled: boolean;
}

interface RssItem {
  title?:       string | { "#text"?: string };
  link?:        string;
  description?: string | { "#text"?: string };
  pubDate?:     string;
  "dc:date"?:   string;
  "content:encoded"?: string;
  enclosure?:   { "@_url"?: string; "@_type"?: string };
  "media:content"?: { "@_url"?: string };
  author?:      string;
  "dc:creator"?: string;
  guid?:        string | { "#text"?: string };
}

export interface RssFetchOptions {
  /** Only return articles published on or after this date */
  from?: Date;
  /** Only return articles published on or before this date */
  to?: Date;
  /** Keywords to match against (loaded from DB by caller) */
  keywords: string[];
}

/** Safely extract a string value from an RSS field (may be string or object). */
function extractString(val: unknown): string {
  if (!val) return "";
  if (typeof val === "string") return val;
  if (typeof val === "object" && val !== null && "#text" in val) {
    return String((val as Record<string, unknown>)["#text"] ?? "");
  }
  return String(val);
}

/** Extract image URL from RSS item. */
function extractImage(item: RssItem): string | undefined {
  if (item.enclosure?.["@_type"]?.startsWith("image/")) {
    return item.enclosure["@_url"];
  }
  if (item["media:content"]?.["@_url"]) {
    return item["media:content"]["@_url"];
  }
  return undefined;
}

/** Parse a raw RSS item into a RawArticle. */
function parseRssItem(
  item:    RssItem,
  config:  RssFeedConfig,
  options: RssFetchOptions
): RawArticle | null {
  const title   = sanitizeText(extractString(item.title));
  const url     = extractString(item.link) || extractString(item.guid);
  const snippet = sanitizeAndTruncate(
    extractString(item.description || item["content:encoded"]),
    500
  );
  const author  = sanitizeText(
    extractString(item.author || item["dc:creator"])
  );
  const pubDateStr  = item.pubDate || item["dc:date"];
  const publishedAt = pubDateStr ? new Date(pubDateStr) : new Date();

  if (!title || !url) return null;
  if (isNaN(publishedAt.getTime())) return null;

  // ── Date range filtering ──────────────────────────────────────────────────
  if (options.from && publishedAt < options.from) return null;
  if (options.to   && publishedAt > options.to)   return null;

  // ── Keyword filtering ─────────────────────────────────────────────────────
  const searchText = `${title} ${snippet}`;
  const matched = matchKeywords(searchText, options.keywords);
  if (matched.length === 0) return null;

  return {
    title,
    url: url.split("?")[0] + (url.includes("?") ? "?" + url.split("?")[1] : ""),
    outlet:       config.outlet,
    outletDomain: config.domain,
    publishedAt,
    snippet:      snippet || undefined,
    imageUrl:     extractImage(item),
    author:       author || undefined,
    source:       "RSS",
  };
}

/** Fetch and parse a single RSS feed. */
export async function fetchRssFeed(
  config:  RssFeedConfig,
  options: RssFetchOptions
): Promise<{ articles: RawArticle[]; rawFetched: number; error?: string }> {
  const parser = new XMLParser({
    ignoreAttributes:    false,
    attributeNamePrefix: "@_",
    textNodeName:        "#text",
    parseTagValue:       true,
    trimValues:          true,
  });

  try {
    const response = await fetch(config.url, {
      headers: {
        "User-Agent":
          "NewsAggregatorBot/1.0 (compliant RSS reader; contact: admin@example.com)",
        Accept: "application/rss+xml, application/xml, text/xml, */*",
      },
      signal: AbortSignal.timeout(15000), // 15s timeout
    });

    if (!response.ok) {
      return {
        articles:   [],
        rawFetched: 0,
        error: `HTTP ${response.status} from ${config.url}`,
      };
    }

    const xml  = await response.text();
    const data = parser.parse(xml);

    // Handle both RSS 2.0 and Atom feeds
    const channel = data?.rss?.channel || data?.feed;
    if (!channel) {
      return { articles: [], rawFetched: 0, error: `No channel/feed element found in ${config.url}` };
    }

    const rawItems: RssItem[] =
      Array.isArray(channel.item)
        ? channel.item
        : channel.item
        ? [channel.item]
        : Array.isArray(channel.entry)
        ? channel.entry
        : channel.entry
        ? [channel.entry]
        : [];

    const articles: RawArticle[] = [];
    for (const item of rawItems) {
      const parsed = parseRssItem(item, config, options);
      if (parsed) articles.push(parsed);
    }

    return { articles, rawFetched: rawItems.length };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { articles: [], rawFetched: 0, error: `Failed to fetch ${config.url}: ${message}` };
  }
}

/** Load feed configs from the JSON config file. */
export async function loadFeedConfigs(): Promise<RssFeedConfig[]> {
  // In Next.js we read from the filesystem at build/runtime
  try {
    const fs   = await import("fs/promises");
    const path = await import("path");
    const configPath = path.join(process.cwd(), "prisma", "rss-feeds.json");
    const raw  = await fs.readFile(configPath, "utf-8");
    const data = JSON.parse(raw) as { feeds: RssFeedConfig[] };
    return data.feeds.filter((f) => f.enabled);
  } catch {
    return [];
  }
}
