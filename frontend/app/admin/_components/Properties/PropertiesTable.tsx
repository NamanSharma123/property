"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Search, Eye, Trash2, ArrowRightLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import adminApi, { AdminProperty } from "@/lib/adminApi";
import { PageHeader } from "@/app/admin/_components/PageHeader";
import TransferOwnershipDialog from "./TransferOwnershipDialog";

const money = (n: number | string | null) => n == null ? "—" : `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const statusTone: Record<string, string> = {
  active: "bg-green-50 text-green-700 border-green-200",
  inactive: "bg-gray-50 text-gray-500 border-gray-200",
};

export default function PropertiesTable({ isFullAdmin }: { isFullAdmin: boolean }) {
  const [rows, setRows] = useState<AdminProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await adminApi.properties.getAll({
      search: search || undefined,
      status: status === "all" ? undefined : status,
      page,
      limit: 20,
    });
    if (res.success && res.data) {
      setRows(res.data.properties);
      setPages(res.data.pagination.pages || 1);
      setTotal(res.data.pagination.total);
    } else {
      toast.error(res.error || "Failed to load properties");
    }
    setLoading(false);
  }, [search, status, page]);

  useEffect(() => {
    const handle = setTimeout(() => setPage(1), 350);
    return () => clearTimeout(handle);
  }, [search, status]);

  useEffect(() => { load(); }, [load]);

  const deleteProperty = async (p: AdminProperty) => {
    setBusyId(p.id);
    const res = await adminApi.properties.remove(p.id);
    setBusyId(null);
    if (res.success) {
      toast.success("Property deleted");
      load();
    } else {
      toast.error(res.error || "Could not delete property");
    }
  };

  const transferOwnership = async (p: AdminProperty, newOwnerId: string) => {
    const res = await adminApi.properties.transferOwnership(p.id, newOwnerId);
    if (res.success) {
      toast.success(res.message || "Transferred");
      load();
    } else {
      toast.error(res.error || "Transfer failed");
    }
  };

  return (
    <div>
      <PageHeader eyebrow="Admin" title="Properties" description="Every property across every user's portfolio." />

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search address, name, owner…" className="pl-9" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Property</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead className="text-right">Current value</TableHead>
                <TableHead className="text-right">Loan balance</TableHead>
                <TableHead className="text-right">Net cash flow</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-10 text-gray-400">Loading…</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-10 text-gray-400">No properties match.</TableCell></TableRow>
              ) : rows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="text-sm font-medium text-gray-900">{p.name}</div>
                    <div className="text-xs text-gray-400">{p.full_address || "—"}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-700">{p.owner_name || "—"}</div>
                    <div className="text-xs text-gray-400">{p.owner_email}</div>
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{money(p.current_value)}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{money(p.loanBalance)}</TableCell>
                  <TableCell className={`text-right text-sm font-medium tabular-nums ${p.netCashFlow < 0 ? "text-red-600" : "text-green-700"}`}>
                    {p.netCashFlow >= 0 ? "+" : "−"}{money(Math.abs(p.netCashFlow))}
                  </TableCell>
                  <TableCell><Badge variant="outline" className={statusTone[p.status] || ""}>{p.status}</Badge></TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/admin/properties/${p.id}`} className="p-1.5 rounded-md text-gray-400 hover:text-primary hover:bg-gray-50" title="View">
                        <Eye size={16} />
                      </Link>
                      {isFullAdmin && (
                        <>
                          <TransferOwnershipDialog
                            currentOwnerId={p.owner_id}
                            onTransferred={(newOwnerId) => transferOwnership(p, newOwnerId)}
                            trigger={
                              <button className="p-1.5 rounded-md text-gray-400 hover:text-primary hover:bg-gray-50" title="Transfer ownership">
                                <ArrowRightLeft size={16} />
                              </button>
                            }
                          />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button disabled={busyId === p.id} className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-40" title="Delete">
                                <Trash2 size={16} />
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete {p.name}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This permanently deletes the property and everything tied to it (transactions, documents, loans). This cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteProperty(p)}>Delete</AlertDialogAction>
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
          <span>{total} propert{total === 1 ? "y" : "ies"}</span>
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
