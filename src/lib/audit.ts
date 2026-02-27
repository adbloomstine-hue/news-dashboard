/**
 * Audit log helper — records admin actions for compliance.
 */

import prisma from "@/lib/prisma";

export type AuditAction =
  | "APPROVED"
  | "REJECTED"
  | "EDITED"
  | "QUEUED"
  | "MANUAL_ENTRY"
  | "INGESTED"
  | "NEEDS_MANUAL"
  | "URL_INGESTED";

export async function writeAuditLog({
  articleId,
  action,
  actorEmail,
  details,
}: {
  articleId?: string;
  action: AuditAction;
  actorEmail: string;
  details?: Record<string, unknown>;
}) {
  return prisma.auditLog.create({
    data: {
      articleId,
      action,
      actorEmail,
      details: JSON.stringify(details ?? {}),
    },
  });
}
