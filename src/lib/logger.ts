/**
 * Structured logger using Pino.
 * In production, pipe output to your log aggregator (Datadog, Logtail, etc.)
 */

import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "debug"),
  transport:
    process.env.NODE_ENV !== "production"
      ? { target: "pino-pretty", options: { colorize: true, ignore: "pid,hostname" } }
      : undefined,
  base: { service: "news-dashboard" },
});

export default logger;
