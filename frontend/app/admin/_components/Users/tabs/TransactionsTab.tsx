"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import adminApi from "@/lib/adminApi";
import EmptyTab from "./EmptyTab";

interface TransactionRow {
  id: string;
  date: string;
  description: string;
  property_name: string | null;
  category_display_name: string | null;
  category_name: string | null;
  type: "income" | "expense";
  signedAmount: number;
  transaction_source: string;
  status: string;
}

const sourceTone: Record<string, string> = {
  "OCR Upload": "bg-[hsl(var(--sidebar-active-bg))] text-primary border-transparent",
  "Manual Entry": "bg-gray-50 text-gray-500 border-gray-200",
  "Basiq": "bg-[hsl(var(--sidebar-active-bg))] text-primary border-transparent",
};

export default function TransactionsTab({ userId }: { userId: string }) {
  const [rows, setRows] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await adminApi.users.getTransactions(userId, { limit: 50 });
      if (cancelled) return;
      if (res.success && res.data) {
        setRows(res.data.transactions as unknown as TransactionRow[]);
      } else {
        toast.error(res.error || "Failed to load transactions");
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  if (loading) return <div className="py-10 text-center text-gray-400 text-sm">Loading…</div>;
  if (rows.length === 0) return <EmptyTab title="No transactions" note="This user hasn't recorded any income or expenses yet." />;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Property</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Source</TableHead>
          <TableHead className="text-right">Amount</TableHead>
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
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
