"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { Search, Pencil, Trash2, Plus, ChevronLeft, ChevronRight, Link2Off } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import adminApi, { AdminLoan } from "@/lib/adminApi";
import { PageHeader } from "@/app/admin/_components/PageHeader";
import LoanFormDialog from "./LoanFormDialog";

const money = (n: string | number | null) => n == null ? "—" : `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const statusTone: Record<string, string> = {
  active: "bg-green-50 text-green-700 border-green-200",
  closed: "bg-gray-50 text-gray-500 border-gray-200",
  refinanced: "bg-amber-50 text-amber-600 border-amber-200",
};

export default function LoansTable({ isFullAdmin }: { isFullAdmin: boolean }) {
  const [rows, setRows] = useState<AdminLoan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminLoan | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await adminApi.loans.getAll({
      search: search || undefined,
      status: status === "all" ? undefined : status,
      page, limit: 25,
    });
    if (res.success && res.data) {
      setRows(res.data.loans);
      setPages(res.data.pagination.pages || 1);
      setTotal(res.data.pagination.total);
    } else {
      toast.error(res.error || "Failed to load loans");
    }
    setLoading(false);
  }, [search, status, page]);

  useEffect(() => {
    const handle = setTimeout(() => setPage(1), 350);
    return () => clearTimeout(handle);
  }, [search, status]);

  useEffect(() => { load(); }, [load]);

  const remove = async (loan: AdminLoan) => {
    const res = await adminApi.loans.remove(loan.id);
    if (res.success) { toast.success("Loan deleted"); load(); }
    else toast.error(res.error || "Delete failed");
  };

  return (
    <div>
      <PageHeader eyebrow="Admin" title="Loans" description="Manually tracked loans, linked to a property. Basiq open-banking sync is reserved but not yet connected." />

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search lender, owner…" className="pl-9" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
            <SelectItem value="refinanced">Refinanced</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex-1" />
        {isFullAdmin && (
          <button onClick={() => { setEditing(null); setFormOpen(true); }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
            <Plus size={14} /> Add loan
          </button>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lender</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead>Basiq</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-10 text-gray-400">Loading…</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-10 text-gray-400">No loans match.</TableCell></TableRow>
              ) : rows.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="text-sm text-gray-900">{l.lender}</TableCell>
                  <TableCell>
                    <Link href={`/admin/properties/${l.property_id}`} className="text-sm text-primary hover:underline">{l.property_name}</Link>
                    <div className="text-xs text-gray-400">{l.property_address}</div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">{l.owner_name}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{money(l.current_balance)}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{l.interest_rate ? `${l.interest_rate}%` : "—"}</TableCell>
                  <TableCell>
                    <button
                      disabled
                      title="Basiq open-banking sync isn't connected yet — requires live API keys"
                      className="flex items-center gap-1 text-xs text-gray-400 cursor-not-allowed"
                    >
                      <Link2Off size={12} /> Not connected
                    </button>
                  </TableCell>
                  <TableCell><Badge variant="outline" className={statusTone[l.status] || ""}>{l.status}</Badge></TableCell>
                  <TableCell>
                    {isFullAdmin && (
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => { setEditing(l); setFormOpen(true); }} className="p-1.5 rounded-md text-gray-400 hover:text-primary hover:bg-gray-50" title="Edit"><Pencil size={16} /></button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50" title="Delete"><Trash2 size={16} /></button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete this loan?</AlertDialogTitle>
                              <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => remove(l)}>Delete</AlertDialogAction>
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
          <span>{total} loan{total === 1 ? "" : "s"}</span>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="p-1.5 rounded-md border border-gray-200 disabled:opacity-40 hover:bg-gray-50"><ChevronLeft size={14} /></button>
            <span className="tabular-nums text-xs">{page} / {pages}</span>
            <button disabled={page >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))} className="p-1.5 rounded-md border border-gray-200 disabled:opacity-40 hover:bg-gray-50"><ChevronRight size={14} /></button>
          </div>
        </div>
      </div>

      {isFullAdmin && (
        <LoanFormDialog key={editing?.id || "create"} loan={editing} open={formOpen} onOpenChange={setFormOpen} onSaved={load} />
      )}
    </div>
  );
}
