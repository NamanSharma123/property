"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import adminApi from "@/lib/adminApi";
import EmptyTab from "./EmptyTab";

interface DocumentRow {
  id: string;
  file_name: string;
  document_type: string | null;
  property_name: string | null;
  status: string;
  ocr_confidence: number | null;
  created_at: string;
}

const statusTone: Record<string, string> = {
  completed: "bg-green-50 text-green-700 border-green-200",
  pending: "bg-amber-50 text-amber-600 border-amber-200",
  failed: "bg-red-50 text-red-600 border-red-200",
};

export default function DocumentsTab({ userId }: { userId: string }) {
  const [rows, setRows] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await adminApi.users.getDocuments(userId, { limit: 50 });
      if (cancelled) return;
      if (res.success && res.data) {
        setRows(res.data.documents as unknown as DocumentRow[]);
      } else {
        toast.error(res.error || "Failed to load documents");
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  if (loading) return <div className="py-10 text-center text-gray-400 text-sm">Loading…</div>;
  if (rows.length === 0) return <EmptyTab title="No documents" note="This user hasn't uploaded any statements or receipts yet." />;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>File</TableHead>
          <TableHead>Property</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">OCR confidence</TableHead>
          <TableHead>Uploaded</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((d) => (
          <TableRow key={d.id}>
            <TableCell>
              <div className="text-sm text-gray-900">{d.file_name}</div>
              {d.document_type && <div className="text-xs text-gray-400">{d.document_type}</div>}
            </TableCell>
            <TableCell className="text-sm text-gray-500">{d.property_name || "—"}</TableCell>
            <TableCell><Badge variant="outline" className={statusTone[d.status] || ""}>{d.status}</Badge></TableCell>
            <TableCell className="text-right text-sm tabular-nums">
              {d.ocr_confidence != null ? `${Math.round(d.ocr_confidence)}%` : "—"}
            </TableCell>
            <TableCell className="text-xs text-gray-500 whitespace-nowrap">{new Date(d.created_at).toLocaleDateString()}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
