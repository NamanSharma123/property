"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Eye, Check, X, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import adminApi, { AdminDocument } from "@/lib/adminApi";
import ReviewDocumentDialog from "./ReviewDocumentDialog";

export default function ReviewQueueTab({ status, isFullAdmin }: { status: "pending" | "completed" | "failed"; isFullAdmin?: boolean }) {
  const [rows, setRows] = useState<AdminDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await adminApi.documents.getAll({ status, page, limit: 20 });
    if (res.success && res.data) {
      setRows(res.data.documents);
      setPages(res.data.pagination.pages || 1);
      setTotal(res.data.pagination.total);
    } else {
      toast.error(res.error || "Failed to load documents");
    }
    setLoading(false);
    setSelected(new Set());
  }, [status, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [status]);

  const toggleOne = (id: string, checked: boolean) => setSelected((prev) => {
    const next = new Set(prev);
    if (checked) next.add(id);
    else next.delete(id);
    return next;
  });

  const bulkApprove = async () => {
    const res = await adminApi.ocr.bulkApprove(Array.from(selected));
    if (res.success) { toast.success(res.message || "Approved"); load(); }
    else toast.error(res.error || "Bulk approve failed");
  };

  const bulkReject = async () => {
    const res = await adminApi.ocr.bulkReject(Array.from(selected));
    if (res.success) { toast.success(res.message || "Rejected"); load(); }
    else toast.error(res.error || "Bulk reject failed");
  };

  const remove = async (id: string) => {
    setBusyId(id);
    const res = await adminApi.documents.remove(id);
    setBusyId(null);
    if (res.success) {
      toast.success("Document deleted");
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      load();
    } else {
      toast.error(res.error || "Delete failed");
    }
  };

  return (
    <div>
      {status === "pending" && selected.size > 0 && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-[hsl(var(--sidebar-active-bg))] text-sm text-primary">
          <span className="font-medium">{selected.size} selected</span>
          <button onClick={bulkApprove} className="flex items-center gap-1 ml-2 px-2 py-1 rounded-md hover:bg-white/60"><Check size={13} /> Bulk approve</button>
          <button onClick={bulkReject} className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-white/60"><X size={13} /> Bulk reject</button>
        </div>
      )}

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {status === "pending" && <TableHead className="w-8"></TableHead>}
              <TableHead>File</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead className="text-right">Confidence</TableHead>
              <TableHead>Uploaded</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-10 text-gray-400">Loading…</TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-10 text-gray-400">Nothing here.</TableCell></TableRow>
            ) : rows.map((d) => (
              <TableRow key={d.id}>
                {status === "pending" && (
                  <TableCell><Checkbox checked={selected.has(d.id)} onCheckedChange={(c) => toggleOne(d.id, !!c)} /></TableCell>
                )}
                <TableCell className="text-sm text-gray-900">{d.file_name}</TableCell>
                <TableCell className="text-sm text-gray-500">{d.owner_name}</TableCell>
                <TableCell className="text-right text-sm tabular-nums">
                  {d.ocr_confidence != null ? (
                    <Badge variant="outline" className={d.ocr_confidence >= 80 ? "bg-green-50 text-green-700 border-green-200" : "bg-amber-50 text-amber-600 border-amber-200"}>
                      {Math.round(d.ocr_confidence)}%
                    </Badge>
                  ) : "—"}
                </TableCell>
                <TableCell className="text-xs text-gray-500 whitespace-nowrap">{new Date(d.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <div className="flex justify-end items-center gap-1">
                    <button onClick={() => setReviewing(d.id)} className="p-1.5 rounded-md text-gray-400 hover:text-primary hover:bg-gray-50" title="Review">
                      <Eye size={16} />
                    </button>
                    {isFullAdmin && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button disabled={busyId === d.id} className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-40" title="Delete">
                            <Trash2 size={16} />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete this document?</AlertDialogTitle>
                            <AlertDialogDescription>
                              {d.file_name} will be permanently removed from the review queue. This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => remove(d.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between px-1 py-3 text-sm text-gray-500">
        <span>{total} document{total === 1 ? "" : "s"}</span>
        <div className="flex items-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="p-1.5 rounded-md border border-gray-200 disabled:opacity-40 hover:bg-gray-50"><ChevronLeft size={14} /></button>
          <span className="tabular-nums text-xs">{page} / {pages}</span>
          <button disabled={page >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))} className="p-1.5 rounded-md border border-gray-200 disabled:opacity-40 hover:bg-gray-50"><ChevronRight size={14} /></button>
        </div>
      </div>

      <ReviewDocumentDialog
        documentId={reviewing}
        open={!!reviewing}
        onOpenChange={(open) => !open && setReviewing(null)}
        onDecided={load}
      />
    </div>
  );
}
