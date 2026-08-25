"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import adminApi from "@/lib/adminApi";
import EmptyTab from "./EmptyTab";

interface PropertyRow {
  id: string;
  name: string;
  full_address: string | null;
  type: string;
  purchase_price: string | null;
  current_value: string | null;
  status: string;
}

const money = (v: string | null) => v ? `$${Number(v).toLocaleString()}` : "—";

export default function PropertiesTab({ userId }: { userId: string }) {
  const [rows, setRows] = useState<PropertyRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await adminApi.users.getProperties(userId, { limit: 50 });
      if (cancelled) return;
      if (res.success && res.data) {
        setRows(res.data.properties as unknown as PropertyRow[]);
      } else {
        toast.error(res.error || "Failed to load properties");
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  if (loading) return <div className="py-10 text-center text-gray-400 text-sm">Loading…</div>;
  if (rows.length === 0) return <EmptyTab title="No properties" note="This user hasn't added any properties yet." />;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Property</TableHead>
          <TableHead>Type</TableHead>
          <TableHead className="text-right">Purchase price</TableHead>
          <TableHead className="text-right">Current value</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((p) => (
          <TableRow key={p.id}>
            <TableCell>
              <div className="text-sm font-medium text-gray-900">{p.name}</div>
              <div className="text-xs text-gray-400">{p.full_address || "—"}</div>
            </TableCell>
            <TableCell className="text-sm text-gray-600 capitalize">{p.type}</TableCell>
            <TableCell className="text-right text-sm tabular-nums">{money(p.purchase_price)}</TableCell>
            <TableCell className="text-right text-sm tabular-nums">{money(p.current_value)}</TableCell>
            <TableCell><Badge variant="outline">{p.status}</Badge></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
