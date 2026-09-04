"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Search, Trash2, Pencil, ChevronLeft, ChevronRight, Download, Tag, ArrowRightLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import adminApi, { AdminTransaction } from "@/lib/adminApi";
import { PageHeader } from "@/app/admin/_components/PageHeader";
import UserFilterSelect from "@/app/admin/_components/shared/UserFilterSelect";
import TransactionEditDialog from "./TransactionEditDialog";

const sourceTone: Record<string, string> = {
  "OCR Upload": "bg-[hsl(var(--sidebar-active-bg))] text-primary border-transparent",
  "Manual Entry": "bg-gray-50 text-gray-500 border-gray-200",
};

function BulkCategoryDialog({ open, onOpenChange, onApply }: { open: boolean; onOpenChange: (o: boolean) => void; onApply: (categoryName: string) => Promise<void> }) {
  const [categoryName, setCategoryName] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Bulk update category</DialogTitle></DialogHeader>
        <Input value={categoryName} onChange={(e) => setCategoryName(e.target.value)} placeholder="Category name…" />
        <DialogFooter>
          <button
            disabled={!categoryName.trim() || busy}
            onClick={async () => { setBusy(true); await onApply(categoryName.trim()); setBusy(false); setCategoryName(""); }}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40"
          >
            {busy ? "Applying…" : "Apply"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BulkPropertyDialog({ open, onOpenChange, onApply }: { open: boolean; onOpenChange: (o: boolean) => void; onApply: (propertyId: string) => Promise<void> }) {
  const [propertyId, setPropertyId] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Bulk reassign property</DialogTitle></DialogHeader>
        <p className="text-xs text-gray-500">
          Only transactions already owned by that property&apos;s owner will be moved — others are skipped.
        </p>
        <Input value={propertyId} onChange={(e) => setPropertyId(e.target.value)} placeholder="Target property ID…" />
        <DialogFooter>
          <button
            disabled={!propertyId.trim() || busy}
            onClick={async () => { setBusy(true); await onApply(propertyId.trim()); setBusy(false); setPropertyId(""); }}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40"
          >
            {busy ? "Applying…" : "Apply"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function TransactionsTable({ isFullAdmin }: { isFullAdmin: boolean }) {
  const [rows, setRows] = useState<AdminTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [source, setSource] = useState("all");
  const [userId, setUserId] = useState("all");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<AdminTransaction | null>(null);
  const [bulkCategoryOpen, setBulkCategoryOpen] = useState(false);
  const [bulkPropertyOpen, setBulkPropertyOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await adminApi.transactions.getAll({
      search: search || undefined,
      type: type === "all" ? undefined : type,
      source: source === "all" ? undefined : source,
      userId: userId === "all" ? undefined : userId,
      page,
      limit: 25,
    });
    if (res.success && res.data) {
      setRows(res.data.transactions);
      setPages(res.data.pagination.pages || 1);
      setTotal(res.data.pagination.total);
    } else {
      toast.error(res.error || "Failed to load transactions");
    }
    setLoading(false);
  }, [search, type, source, userId, page]);

  useEffect(() => {
    const handle = setTimeout(() => setPage(1), 350);
    return () => clearTimeout(handle);
  }, [search, type, source, userId]);

  useEffect(() => { load(); setSelected(new Set()); }, [load]);

  const toggleAll = (checked: boolean) => setSelected(checked ? new Set(rows.map((r) => r.id)) : new Set());
  const toggleOne = (id: string, checked: boolean) => setSelected((prev) => {
    const next = new Set(prev);
    if (checked) next.add(id);
    else next.delete(id);
    return next;
  });

  const deleteTransaction = async (t: AdminTransaction) => {
    const res = await adminApi.transactions.remove(t.id);
    if (res.success) { toast.success("Transaction deleted"); load(); }
    else toast.error(res.error || "Delete failed");
  };

  const applyBulkCategory = async (categoryName: string) => {
    const res = await adminApi.transactions.bulkCategory(Array.from(selected), { categoryName });
    if (res.success) { toast.success(res.message || "Updated"); setBulkCategoryOpen(false); load(); }
    else toast.error(res.error || "Bulk update failed");
  };

  const applyBulkProperty = async (propertyId: string) => {
    const res = await adminApi.transactions.bulkReassignProperty(Array.from(selected), propertyId);
    if (res.success) { toast.success(res.message || "Updated"); setBulkPropertyOpen(false); load(); }
    else toast.error(res.error || "Bulk reassign failed");
  };

  const exportCsv = async () => {
    const res = await adminApi.transactions.getAll({
      search: search || undefined, type: type === "all" ? undefined : type,
      source: source === "all" ? undefined : source, userId: userId === "all" ? undefined : userId, limit: 5000,
    });
    if (!res.success || !res.data) return;
    const header = "Date,Description,Owner,Property,Category,Type,Amount,Source,Status\n";
    const body = res.data.transactions.map((t) =>
      [t.date, t.description, t.owner_name, t.property_name, t.category_display_name || t.category_name, t.type, t.amount, t.transaction_source, t.status]
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")
    ).join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "properly-transactions.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader eyebrow="Admin" title="Transactions" description="Every income and expense entry across every user." />

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search description, owner…" className="pl-9" />
        </div>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="income">Income</SelectItem>
            <SelectItem value="expense">Expense</SelectItem>
          </SelectContent>
        </Select>
        <Select value={source} onValueChange={setSource}>
          <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Source" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            <SelectItem value="ocr">OCR</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
            <SelectItem value="basiq">Basiq</SelectItem>
          </SelectContent>
        </Select>
        <UserFilterSelect value={userId} onChange={setUserId} className="w-full sm:w-56" />
        <div className="flex-1" />
        <button onClick={exportCsv} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">
          <Download size={14} /> Export CSV
        </button>
      </div>

      {isFullAdmin && selected.size > 0 && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-[hsl(var(--sidebar-active-bg))] text-sm text-primary">
          <span className="font-medium">{selected.size} selected</span>
          <button onClick={() => setBulkCategoryOpen(true)} className="flex items-center gap-1 ml-2 px-2 py-1 rounded-md hover:bg-white/60"><Tag size={13} /> Category</button>
          <button onClick={() => setBulkPropertyOpen(true)} className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-white/60"><ArrowRightLeft size={13} /> Reassign property</button>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {isFullAdmin && (
                  <TableHead className="w-8">
                    <Checkbox checked={rows.length > 0 && selected.size === rows.length} onCheckedChange={(c) => toggleAll(!!c)} />
                  </TableHead>
                )}
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-10 text-gray-400">Loading…</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-10 text-gray-400">No transactions match.</TableCell></TableRow>
              ) : rows.map((t) => (
                <TableRow key={t.id}>
                  {isFullAdmin && (
                    <TableCell><Checkbox checked={selected.has(t.id)} onCheckedChange={(c) => toggleOne(t.id, !!c)} /></TableCell>
                  )}
                  <TableCell className="text-sm text-gray-600 whitespace-nowrap">{t.date}</TableCell>
                  <TableCell className="text-sm text-gray-900">{t.description}</TableCell>
                  <TableCell className="text-sm text-gray-500">{t.owner_name}</TableCell>
                  <TableCell className="text-sm text-gray-500">{t.property_name || "—"}</TableCell>
                  <TableCell><Badge variant="outline" className={sourceTone[t.transaction_source] || ""}>{t.transaction_source}</Badge></TableCell>
                  <TableCell className={`text-right text-sm font-medium tabular-nums ${t.type === "expense" ? "text-red-600" : "text-green-700"}`}>
                    {t.signedAmount >= 0 ? "+" : "−"}${Math.abs(t.signedAmount).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {isFullAdmin && (
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setEditing(t)} className="p-1.5 rounded-md text-gray-400 hover:text-primary hover:bg-gray-50" title="Edit"><Pencil size={16} /></button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50" title="Delete"><Trash2 size={16} /></button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete this transaction?</AlertDialogTitle>
                              <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteTransaction(t)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
          <span>{total} transaction{total === 1 ? "" : "s"}</span>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="p-1.5 rounded-md border border-gray-200 disabled:opacity-40 hover:bg-gray-50"><ChevronLeft size={14} /></button>
            <span className="tabular-nums text-xs">{page} / {pages}</span>
            <button disabled={page >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))} className="p-1.5 rounded-md border border-gray-200 disabled:opacity-40 hover:bg-gray-50"><ChevronRight size={14} /></button>
          </div>
        </div>
      </div>

      <TransactionEditDialog
        key={editing?.id}
        transaction={editing}
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
        onSaved={load}
      />
      <BulkCategoryDialog open={bulkCategoryOpen} onOpenChange={setBulkCategoryOpen} onApply={applyBulkCategory} />
      <BulkPropertyDialog open={bulkPropertyOpen} onOpenChange={setBulkPropertyOpen} onApply={applyBulkProperty} />
    </div>
  );
}
