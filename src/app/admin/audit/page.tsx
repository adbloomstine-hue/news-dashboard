"use client";

import React, { useEffect, useState } from "react";
import { History, ChevronLeft, ChevronRight } from "lucide-react";
import { AuditLogTable } from "@/components/admin/AuditLogTable";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { AuditLogEntry } from "@/types";

const PAGE_SIZE = 50;

export default function AuditPage() {
  const [entries, setEntries]   = useState<AuditLogEntry[]>([]);
  const [total,   setTotal]     = useState(0);
  const [page,    setPage]      = useState(1);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/audit?page=${page}&pageSize=${PAGE_SIZE}`)
      .then((r) => r.json())
      .then((data) => {
        setEntries(data.items ?? []);
        setTotal(data.total ?? 0);
      })
      .finally(() => setLoading(false));
  }, [page]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-[--text-primary] flex items-center gap-2">
            <History className="h-6 w-6 text-brand-400" />
            Audit Log
          </h1>
          <p className="text-sm text-[--text-secondary] mt-0.5">
            Complete record of admin actions — {total} total entries.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : (
        <AuditLogTable entries={entries} />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-[--text-secondary]">
          <span>
            Page {page} of {totalPages} ({total} entries)
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading}
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
