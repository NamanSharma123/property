"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Search, Eye, Trash2, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import adminApi, { AdminDocument } from "@/lib/adminApi";
import { PageHeader } from "@/app/admin/_components/PageHeader";
import UserFilterSelect from "@/app/admin/_components/shared/UserFilterSelect";

const statusTone: Record<string, string> = {
  completed: "bg-green-50 text-green-700 border-green-200",
  pending: "bg-amber-50 text-amber-600 border-amber-200",
  failed: "bg-red-50 text-red-600 border-red-200",
  stored: "bg-blue-50 text-blue-600 border-blue-200",
};

export default function DocumentsTable({ isFullAdmin }: { isFullAdmin: boolean }) {
  const [rows, setRows] = useState<AdminDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [userId, setUserId] = useState("all");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await adminApi.documents.getAll({
      search: search || undefined,
      status: status === "all" ? undefined : status,
      userId: userId === "all" ? undefined : userId,
      page, limit: 25,
    });
    if (res.success && res.data) {
      setRows(res.data.documents);
      setPages(res.data.pagination.pages || 1);
      setTotal(res.data.pagination.total);
    } else {
      toast.error(res.error || "Failed to load documents");
    }
    setLoading(false);
  }, [search, status, userId, page]);

  useEffect(() => {
    const handle = setTimeout(() => setPage(1), 350);
    return () => clearTimeout(handle);
  }, [search, status, userId]);

  useEffect(() => { load(); }, [load]);

  const preview = async (d: AdminDocument) => {
    setBusyId(d.id);
    const res = await adminApi.documents.getViewUrl(d.id);
    setBusyId(null);
    if (res.success && res.data) {
      window.open(res.data.url, "_blank", "noopener,noreferrer");
    } else {
      toast.error(res.error || "Could not open document");
    }
  };

  const reprocess = async (d: AdminDocument) => {
    setBusyId(d.id);
    const res = await adminApi.documents.reprocess(d.id);
    setBusyId(null);
    if (res.success) { toast.success(res.message || "Queued for reprocessing"); load(); }
    else toast.error(res.error || "Could not reprocess");
  };

  const remove = async (d: AdminDocument) => {
    setBusyId(d.id);
    const res = await adminApi.documents.remove(d.id);
    setBusyId(null);
    if (res.success) { toast.success("Document deleted"); load(); }
    else toast.error(res.error || "Delete failed");
  };

  return (
    <div>
      <PageHeader eyebrow="Admin" title="Documents" description="Every statement, receipt, and OCR upload stored in S3, across every user." />

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search file name, owner…" className="pl-9" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="stored">Stored (vault, not OCR&apos;d)</SelectItem>
          </SelectContent>
        </Select>
        <UserFilterSelect value={userId} onChange={setUserId} />
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">OCR confidence</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-10 text-gray-400">Loading…</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-10 text-gray-400">No documents match.</TableCell></TableRow>
              ) : rows.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>
                    <div className="text-sm text-gray-900">{d.file_name}</div>
                    {d.document_type && <div className="text-xs text-gray-400">{d.document_type}</div>}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-700">{d.owner_name}</div>
                    <div className="text-xs text-gray-400">{d.owner_email}</div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">{d.property_name || "—"}</TableCell>
                  <TableCell><Badge variant="outline" className={statusTone[d.status] || ""}>{d.status}</Badge></TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{d.ocr_confidence != null ? `${Math.round(d.ocr_confidence)}%` : "—"}</TableCell>
                  <TableCell className="text-xs text-gray-500 whitespace-nowrap">{new Date(d.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <button disabled={busyId === d.id} onClick={() => preview(d)} className="p-1.5 rounded-md text-gray-400 hover:text-primary hover:bg-gray-50 disabled:opacity-40" title="Preview / download">
                        <Eye size={16} />
                      </button>
                      {isFullAdmin && (
                        <>
                          <button disabled={busyId === d.id} onClick={() => reprocess(d)} className="p-1.5 rounded-md text-gray-400 hover:text-primary hover:bg-gray-50 disabled:opacity-40" title="Reprocess OCR">
                            <RefreshCw size={16} />
                          </button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button disabled={busyId === d.id} className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-40" title="Delete">
                                <Trash2 size={16} />
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete this document?</AlertDialogTitle>
                                <AlertDialogDescription>This removes the database record. This cannot be undone.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => remove(d)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
          <span>{total} document{total === 1 ? "" : "s"}</span>
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
