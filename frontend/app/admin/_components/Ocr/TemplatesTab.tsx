"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import adminApi, { OcrTemplate } from "@/lib/adminApi";

export default function TemplatesTab({ isFullAdmin }: { isFullAdmin: boolean }) {
  const [rows, setRows] = useState<OcrTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const res = await adminApi.ocr.templates.getAll();
    if (res.success && res.data) setRows(res.data.templates);
    else toast.error(res.error || "Failed to load templates");
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggle = async (t: OcrTemplate) => {
    const nextStatus = t.status === "enabled" ? "disabled" : "enabled";
    const res = await adminApi.ocr.templates.update(t.id, { status: nextStatus });
    if (res.success) {
      toast.success(`${t.name} ${nextStatus}`);
      load();
    } else {
      toast.error(res.error || "Update failed");
    }
  };

  if (loading) return <div className="py-10 text-center text-gray-400 text-sm">Loading…</div>;

  return (
    <div>
      <p className="text-xs text-gray-400 mb-3">
        Extraction itself runs client-side and isn&apos;t driven by these records yet — this is the
        admin-facing registry of recognized document types (enable/disable, confidence threshold, version).
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Template</TableHead>
            <TableHead>Document type</TableHead>
            <TableHead className="text-right">Confidence threshold</TableHead>
            <TableHead>Version</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((t) => (
            <TableRow key={t.id}>
              <TableCell>
                <div className="text-sm font-medium text-gray-900">{t.name}</div>
                {t.description && <div className="text-xs text-gray-400">{t.description}</div>}
              </TableCell>
              <TableCell className="text-sm text-gray-500 font-mono text-xs">{t.document_type}</TableCell>
              <TableCell className="text-right text-sm tabular-nums">{t.confidence_threshold}%</TableCell>
              <TableCell className="text-sm text-gray-500">v{t.version}</TableCell>
              <TableCell>
                {isFullAdmin ? (
                  <div className="flex items-center gap-2">
                    <Switch checked={t.status === "enabled"} onCheckedChange={() => toggle(t)} />
                    <Badge variant="outline" className={t.status === "enabled" ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-500 border-gray-200"}>{t.status}</Badge>
                  </div>
                ) : (
                  <Badge variant="outline" className={t.status === "enabled" ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-500 border-gray-200"}>{t.status}</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
