"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Merge } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import adminApi, { AdminCategory } from "@/lib/adminApi";
import { PageHeader } from "@/app/admin/_components/PageHeader";

const typeTone: Record<string, string> = {
  income: "bg-green-50 text-green-700 border-green-200",
  expense: "bg-amber-50 text-amber-600 border-amber-200",
  loan: "bg-[hsl(var(--sidebar-active-bg))] text-primary border-transparent",
  tax: "bg-red-50 text-red-600 border-red-200",
};

function NewCategoryDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("expense");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    setBusy(true);
    const res = await adminApi.categories.create({ name: name.trim(), type });
    setBusy(false);
    if (res.success) {
      toast.success("Category created");
      setOpen(false); setName("");
      onCreated();
    } else {
      toast.error(res.error || "Create failed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
          <Plus size={14} /> Add category
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New system category</DialogTitle></DialogHeader>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Category name" />
        <Select value={type} onValueChange={setType}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="income">Income</SelectItem>
            <SelectItem value="expense">Expense</SelectItem>
            <SelectItem value="loan">Loan</SelectItem>
            <SelectItem value="tax">Tax</SelectItem>
          </SelectContent>
        </Select>
        <DialogFooter>
          <button disabled={busy} onClick={save} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40">
            {busy ? "Creating…" : "Create"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MergeDialog({ category, all, onMerged }: { category: AdminCategory; all: AdminCategory[]; onMerged: () => void }) {
  const [open, setOpen] = useState(false);
  const [targetId, setTargetId] = useState("");
  const [busy, setBusy] = useState(false);
  const options = all.filter((c) => c.id !== category.id && c.is_active);

  const merge = async () => {
    if (!targetId) return;
    setBusy(true);
    const res = await adminApi.categories.merge(category.id, targetId);
    setBusy(false);
    if (res.success) {
      toast.success(res.message || "Merged");
      setOpen(false);
      onMerged();
    } else {
      toast.error(res.error || "Merge failed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="p-1.5 rounded-md text-gray-400 hover:text-primary hover:bg-gray-50" title="Merge into another category"><Merge size={16} /></button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Merge &quot;{category.name}&quot;</DialogTitle></DialogHeader>
        <p className="text-xs text-gray-500">Every transaction using this category moves to the one you pick, then this one is disabled.</p>
        <Select value={targetId} onValueChange={setTargetId}>
          <SelectTrigger><SelectValue placeholder="Merge into…" /></SelectTrigger>
          <SelectContent>
            {options.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <DialogFooter>
          <button disabled={!targetId || busy} onClick={merge} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40">
            {busy ? "Merging…" : "Merge"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function CategoriesPanel({ isFullAdmin }: { isFullAdmin: boolean }) {
  const [rows, setRows] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    const res = await adminApi.categories.getAll(typeFilter === "all" ? undefined : { type: typeFilter });
    if (res.success && res.data) setRows(res.data.categories);
    else toast.error(res.error || "Failed to load categories");
    setLoading(false);
  };

  useEffect(() => { load(); }, [typeFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const remove = async (c: AdminCategory) => {
    const res = await adminApi.categories.remove(c.id);
    if (res.success) { toast.success("Category disabled"); load(); }
    else toast.error(res.error || "Delete failed");
  };

  return (
    <div>
      <PageHeader eyebrow="Admin" title="Categories" description="System-wide income/expense categories, shared across every user." />

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="income">Income</SelectItem>
            <SelectItem value="expense">Expense</SelectItem>
            <SelectItem value="loan">Loan</SelectItem>
            <SelectItem value="tax">Tax</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex-1" />
        {isFullAdmin && <NewCategoryDialog onCreated={load} />}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-10 text-gray-400">Loading…</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-10 text-gray-400">No categories.</TableCell></TableRow>
              ) : rows.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                      <span className="text-sm text-gray-900">{c.name}</span>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className={typeTone[c.type] || ""}>{c.type}</Badge></TableCell>
                  <TableCell className="text-sm text-gray-500">{c.is_system ? "System" : c.owner_name || "—"}</TableCell>
                  <TableCell><Badge variant="outline" className={c.is_active ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-500 border-gray-200"}>{c.is_active ? "active" : "disabled"}</Badge></TableCell>
                  <TableCell>
                    {isFullAdmin && c.is_active && (
                      <div className="flex items-center justify-end gap-1">
                        <MergeDialog category={c} all={rows} onMerged={load} />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50" title="Disable"><Trash2 size={16} /></button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Disable &quot;{c.name}&quot;?</AlertDialogTitle>
                              <AlertDialogDescription>Existing transactions keep this category — it just won&apos;t be offered for new ones.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => remove(c)}>Disable</AlertDialogAction>
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
      </div>
    </div>
  );
}
