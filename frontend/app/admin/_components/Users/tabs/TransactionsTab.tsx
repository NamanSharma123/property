"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import adminApi, { AdminTransaction } from "@/lib/adminApi";
import TransactionEditDialog from "@/app/admin/_components/Transactions/TransactionEditDialog";
import EmptyTab from "./EmptyTab";

const sourceTone: Record<string, string> = {
  "OCR Upload": "bg-[hsl(var(--sidebar-active-bg))] text-primary border-transparent",
  "Manual Entry": "bg-gray-50 text-gray-500 border-gray-200",
  "Basiq": "bg-[hsl(var(--sidebar-active-bg))] text-primary border-transparent",
};

export default function TransactionsTab({ userId, isFullAdmin }: { userId: string; isFullAdmin: boolean }) {
  const [rows, setRows] = useState<AdminTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AdminTransaction | null>(null);

  const load = useCallback(async () => {
    const res = await adminApi.users.getTransactions(userId, { limit: 50 });
    if (res.success && res.data) {
      setRows(res.data.transactions as unknown as AdminTransaction[]);
    } else {
      toast.error(res.error || "Failed to load transactions");
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const deleteTransaction = async (t: AdminTransaction) => {
    const res = await adminApi.transactions.remove(t.id);
    if (res.success) { toast.success("Transaction deleted"); load(); }
    else toast.error(res.error || "Delete failed");
  };

  if (loading) return <div className="py-10 text-center text-gray-400 text-sm">Loading…</div>;
  if (rows.length === 0) return <EmptyTab title="No transactions" note="This user hasn't recorded any income or expenses yet." />;

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Property</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Source</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            {isFullAdmin && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((t) => (
            <TableRow key={t.id}>
              <TableCell className="text-sm text-gray-600 whitespace-nowrap">{t.date}</TableCell>
              <TableCell className="text-sm text-gray-900">{t.description}</TableCell>
              <TableCell className="text-sm text-gray-500">{t.property_name || "—"}</TableCell>
              <TableCell className="text-sm text-gray-500">{t.category_display_name || t.category_name || "—"}</TableCell>
              <TableCell><Badge variant="outline" className={sourceTone[t.transaction_source] || ""}>{t.transaction_source}</Badge></TableCell>
              <TableCell className={`text-right text-sm font-medium tabular-nums ${t.type === "expense" ? "text-red-600" : "text-green-700"}`}>
                {t.signedAmount >= 0 ? "+" : "−"}${Math.abs(t.signedAmount).toLocaleString()}
              </TableCell>
              {isFullAdmin && (
                <TableCell>
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
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <TransactionEditDialog
        key={editing?.id}
        transaction={editing}
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
        onSaved={load}
      />
    </>
  );
}
