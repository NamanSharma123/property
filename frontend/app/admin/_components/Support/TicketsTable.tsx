"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Search, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import adminApi, { Ticket } from "@/lib/adminApi";
import { PageHeader } from "@/app/admin/_components/PageHeader";

const statusTone: Record<string, string> = {
  open: "bg-amber-50 text-amber-600 border-amber-200",
  in_progress: "bg-[hsl(var(--sidebar-active-bg))] text-primary border-transparent",
  resolved: "bg-green-50 text-green-700 border-green-200",
  closed: "bg-gray-50 text-gray-500 border-gray-200",
};

const priorityTone: Record<string, string> = {
  urgent: "bg-red-50 text-red-600 border-red-200",
  high: "bg-amber-50 text-amber-600 border-amber-200",
  medium: "bg-gray-50 text-gray-500 border-gray-200",
  low: "bg-gray-50 text-gray-400 border-gray-200",
};

export default function TicketsTable() {
  const [rows, setRows] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await adminApi.support.getAll({
      search: search || undefined, status: status === "all" ? undefined : status, page, limit: 20,
    });
    if (res.success && res.data) {
      setRows(res.data.tickets);
      setPages(res.data.pagination.pages || 1);
      setTotal(res.data.pagination.total);
    } else {
      toast.error(res.error || "Failed to load tickets");
    }
    setLoading(false);
  }, [search, status, page]);

  useEffect(() => { const h = setTimeout(() => setPage(1), 350); return () => clearTimeout(h); }, [search, status]);
  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <PageHeader eyebrow="Admin" title="Support Tickets" description="Every enquiry raised across the platform." />

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search subject, user…" className="pl-9" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Assigned</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-10 text-gray-400">Loading…</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-10 text-gray-400">No tickets match.</TableCell></TableRow>
              ) : rows.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="text-sm text-gray-900">{t.subject}</TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-700">{t.user_name}</div>
                    <div className="text-xs text-gray-400">{t.user_email}</div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className={priorityTone[t.priority] || ""}>{t.priority}</Badge></TableCell>
                  <TableCell className="text-sm text-gray-500">{t.assigned_admin_name || "Unassigned"}</TableCell>
                  <TableCell><Badge variant="outline" className={statusTone[t.status] || ""}>{t.status.replace("_", " ")}</Badge></TableCell>
                  <TableCell className="text-xs text-gray-500 whitespace-nowrap">{new Date(t.updated_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <Link href={`/admin/support/${t.id}`} className="p-1.5 rounded-md text-gray-400 hover:text-primary hover:bg-gray-50" title="View">
                        <Eye size={16} />
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
          <span>{total} ticket{total === 1 ? "" : "s"}</span>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="p-1.5 rounded-md border border-gray-200 disabled:opacity-40 hover:bg-gray-50"><ChevronLeft size={14} /></button>
            <span className="tabular-nums text-xs">{page} / {pages}</span>
            <button disabled={page >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))} className="p-1.5 rounded-md border border-gray-200 disabled:opacity-40 hover:bg-gray-50"><ChevronRight size={14} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
