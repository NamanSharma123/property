"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import adminApi, { AdminLoan } from "@/lib/adminApi";
import EmptyTab from "./EmptyTab";

const money = (n: string | number | null) => n == null ? "—" : `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export default function LoansTab({ userId }: { userId: string }) {
  const [rows, setRows] = useState<AdminLoan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await adminApi.users.getLoans(userId, { limit: 50 });
      if (cancelled) return;
      if (res.success && res.data) setRows(res.data.loans);
      else toast.error(res.error || "Failed to load loans");
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  if (loading) return <div className="py-10 text-center text-gray-400 text-sm">Loading…</div>;
  if (rows.length === 0) return <EmptyTab title="No loans" note="This user hasn't had any loans manually added yet." />;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Lender</TableHead>
          <TableHead>Property</TableHead>
          <TableHead className="text-right">Balance</TableHead>
          <TableHead className="text-right">Rate</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((l) => (
          <TableRow key={l.id}>
            <TableCell className="text-sm text-gray-900">{l.lender}</TableCell>
            <TableCell className="text-sm text-gray-500">{l.property_name}</TableCell>
            <TableCell className="text-right text-sm tabular-nums">{money(l.current_balance)}</TableCell>
            <TableCell className="text-right text-sm tabular-nums">{l.interest_rate ? `${l.interest_rate}%` : "—"}</TableCell>
            <TableCell><Badge variant="outline">{l.status}</Badge></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
