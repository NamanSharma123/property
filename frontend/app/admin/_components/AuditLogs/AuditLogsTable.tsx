"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import adminApi, { AuditLogEntry } from "@/lib/adminApi";
import { PageHeader } from "@/app/admin/_components/PageHeader";

function describeChange(entry: AuditLogEntry) {
  if (!entry.new_value) return null;
  const parts = Object.entries(entry.new_value).map(([key, value]) => {
    const from = entry.old_value?.[key];
    return from !== undefined ? `${key}: ${String(from)} → ${String(value)}` : `${key}: ${String(value)}`;
  });
  return parts.join(", ");
}

export default function AuditLogsTable() {
  const [rows, setRows] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await adminApi.auditLogs.getAll({ page, limit: 25 });
      if (cancelled) return;
      if (res.success && res.data) {
        setRows(res.data.auditLogs);
        setPages(res.data.pagination.pages || 1);
        setTotal(res.data.pagination.total);
      } else {
        toast.error(res.error || "Failed to load audit logs");
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [page]);

  return (
    <div>
      <PageHeader eyebrow="Admin" title="Audit Logs" description="Every action taken by an admin or support admin, with before/after values." />

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Change</TableHead>
                <TableHead>IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10 text-gray-400">Loading…</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10 text-gray-400">No admin actions recorded yet.</TableCell></TableRow>
              ) : rows.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-xs text-gray-500 whitespace-nowrap">{new Date(entry.created_at).toLocaleString()}</TableCell>
                  <TableCell className="text-sm text-gray-800">{entry.admin_name || "—"}</TableCell>
                  <TableCell><Badge variant="outline">{entry.action}</Badge></TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {entry.entity_type}{entry.entity_id ? ` · ${entry.entity_id.slice(0, 8)}` : ""}
                  </TableCell>
                  <TableCell className="text-xs text-gray-500 max-w-xs truncate" title={describeChange(entry) || ""}>
                    {describeChange(entry) || "—"}
                  </TableCell>
                  <TableCell className="text-xs text-gray-400">{entry.ip_address || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
          <span>{total} entr{total === 1 ? "y" : "ies"}</span>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="p-1.5 rounded-md border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
              <ChevronLeft size={14} />
            </button>
            <span className="tabular-nums text-xs">{page} / {pages}</span>
            <button disabled={page >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))} className="p-1.5 rounded-md border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
