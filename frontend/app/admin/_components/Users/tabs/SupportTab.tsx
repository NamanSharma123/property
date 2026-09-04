"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import adminApi, { Ticket } from "@/lib/adminApi";
import EmptyTab from "./EmptyTab";

const statusTone: Record<string, string> = {
  open: "bg-amber-50 text-amber-600 border-amber-200",
  in_progress: "bg-[hsl(var(--sidebar-active-bg))] text-primary border-transparent",
  resolved: "bg-green-50 text-green-700 border-green-200",
  closed: "bg-gray-50 text-gray-500 border-gray-200",
};

export default function SupportTab({ userId }: { userId: string }) {
  const [rows, setRows] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await adminApi.support.getAll({ userId, limit: 50 });
      if (cancelled) return;
      if (res.success && res.data) setRows(res.data.tickets);
      else toast.error(res.error || "Failed to load support tickets");
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  if (loading) return <div className="py-10 text-center text-gray-400 text-sm">Loading…</div>;
  if (rows.length === 0) return <EmptyTab title="No support tickets" note="This user hasn't raised any support tickets yet." />;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Subject</TableHead>
          <TableHead>Priority</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Updated</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((t) => (
          <TableRow key={t.id}>
            <TableCell>
              <Link href={`/admin/support/${t.id}`} className="text-sm text-gray-900 hover:text-primary">{t.subject}</Link>
            </TableCell>
            <TableCell><Badge variant="outline">{t.priority}</Badge></TableCell>
            <TableCell><Badge variant="outline" className={statusTone[t.status] || ""}>{t.status.replace("_", " ")}</Badge></TableCell>
            <TableCell className="text-xs text-gray-500 whitespace-nowrap">{new Date(t.updated_at).toLocaleDateString()}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
