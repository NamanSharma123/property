"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import adminApi, { ReportType } from "@/lib/adminApi";
import { PageHeader } from "@/app/admin/_components/PageHeader";

const REPORT_TABS: { value: ReportType; label: string }[] = [
  { value: "profit_loss", label: "P&L" },
  { value: "cash_flow", label: "Cash Flow" },
  { value: "expense_by_category", label: "Expense by Category" },
  { value: "income_by_property", label: "Income by Property" },
  { value: "loan_summary", label: "Loan Summary" },
  { value: "ocr_reports", label: "OCR" },
  { value: "user_reports", label: "Users" },
  { value: "subscription_reports", label: "Subscriptions" },
];

const money = (n: number) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

function findArray(report: Record<string, unknown>): { key: string; rows: Record<string, unknown>[] } | null {
  for (const [key, value] of Object.entries(report)) {
    if (Array.isArray(value) && value.length > 0 && typeof value[0] === "object") {
      return { key, rows: value as Record<string, unknown>[] };
    }
  }
  return null;
}

function StatRow({ report }: { report: Record<string, unknown> }) {
  const scalarEntries = Object.entries(report).filter(([, v]) => typeof v === "number" || typeof v === "string");
  if (scalarEntries.length === 0) return null;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
      {scalarEntries.map(([key, value]) => (
        <div key={key} className="bg-gray-50 rounded-xl p-3">
          <div className="text-xs text-gray-400 capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</div>
          <div className="text-lg font-semibold text-gray-900 tabular-nums">
            {typeof value === "number" ? (key.toLowerCase().includes("rate") || key.toLowerCase().includes("percent") ? `${value}%` : money(value)) : String(value)}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ReportsPanel() {
  const [type, setType] = useState<ReportType>("profit_loss");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [report, setReport] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    adminApi.reports.get(type, { startDate: startDate || undefined, endDate: endDate || undefined }).then((res) => {
      if (cancelled) return;
      if (res.success && res.data) setReport(res.data.report as Record<string, unknown>);
      else toast.error(res.error || "Failed to load report");
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [type, startDate, endDate]);

  const exportCsv = () => {
    if (!report) return;
    const array = findArray(report);
    if (!array || array.rows.length === 0) { toast.error("Nothing tabular to export for this report"); return; }
    const headers = Object.keys(array.rows[0]);
    const csv = [headers.join(","), ...array.rows.map((row) => headers.map((h) => `"${String(row[h] ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `properly-${type}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const array = report ? findArray(report) : null;

  return (
    <div>
      <PageHeader eyebrow="Admin" title="Reports" description="Platform-wide reports, filterable by date range." />

      <div className="flex flex-wrap gap-2 mb-4">
        {REPORT_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setType(tab.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border ${type === tab.value ? "bg-primary text-primary-foreground border-primary" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" />
        <span className="text-xs text-gray-400">to</span>
        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" />
        <div className="flex-1" />
        <button onClick={exportCsv} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">
          <Download size={14} /> Export CSV
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
        {loading ? (
          <div className="py-16 text-center text-gray-400 text-sm">Loading…</div>
        ) : !report ? (
          <div className="py-16 text-center text-gray-400 text-sm">No data.</div>
        ) : (
          <>
            <StatRow report={report} />
            {array && array.rows.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {Object.keys(array.rows[0]).map((h) => (
                        <TableHead key={h} className="capitalize">{h.replace(/([A-Z])/g, " $1").trim()}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {array.rows.map((row, i) => (
                      <TableRow key={i}>
                        {Object.keys(array.rows[0]).map((h) => (
                          <TableCell key={h} className="text-sm text-gray-700">
                            {typeof row[h] === "number" ? Number(row[h]).toLocaleString() : String(row[h] ?? "—")}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-6">No breakdown data for this range.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
