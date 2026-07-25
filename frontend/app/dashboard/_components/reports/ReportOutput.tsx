"use client";

import React from "react";
import { Download, X } from "lucide-react";
import type { ReportData } from "@/lib/reports";
import { reportToCSV } from "@/lib/reports";

function formatCurrency(value: number): string {
  return value.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ReportOutput({ report, onClose, showOwnership }: { report: ReportData; onClose?: () => void; showOwnership?: boolean }) {
  const isAllProperties = report.mode === 'all-properties';

  const handleExportCSV = () => {
    const csv = reportToCSV(report);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    // Property names often contain "/" (e.g. "2/35 Hurley St"), which breaks a filename.
    const suffix = (isAllProperties ? report.columns[0]?.yearLabel : report.columns[0]?.propertyName) || 'report';
    link.download = `income-expenditure-report-${suffix.replace(/[\\/:*?"<>|]/g, '-')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mt-6">
      <div className="p-4 border-b flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">
            {showOwnership ? 'Ownership Wise Report' : isAllProperties ? 'All Properties Report' : 'Individual Property Report'}
          </h2>
          <p className="text-sm text-gray-500">
            {isAllProperties
              ? report.columns[0]?.yearLabel
              : report.columns[0]?.propertyAddress}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600 text-white text-sm font-medium"
            type="button"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
          {onClose && (
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600" type="button">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {report.columns.length === 0 ? (
        <div className="p-8 text-center text-gray-500 text-sm">Nothing to show.</div>
      ) : (
        <div className="overflow-x-auto p-4">
          <table className="w-full text-sm border-collapse">
            <thead>
              {showOwnership ? (
                <>
                  <tr>
                    <th className="text-left p-2 min-w-[200px]"></th>
                    {report.columns.map(c => (
                      <th key={c.key} className="text-right p-2 bg-blue-50 border-b border-blue-100 min-w-[160px] font-semibold text-gray-900">
                        {c.propertyAddress}
                      </th>
                    ))}
                  </tr>
                  <tr className="bg-blue-100/70 text-xs font-medium text-gray-700">
                    <td className="p-2"></td>
                    {report.columns.map(c => <td key={c.key} className="p-2 text-right">{c.ownershipTypeLabel}</td>)}
                  </tr>
                  <tr className="bg-blue-50/60 text-xs font-medium text-gray-600">
                    <td className="p-2"></td>
                    {report.columns.map(c => <td key={c.key} className="p-2 text-right">{c.yearLabel}</td>)}
                  </tr>
                  <tr className="bg-blue-100/70 text-xs font-semibold text-gray-800">
                    <td className="p-2"></td>
                    {report.columns.map(c => <td key={c.key} className="p-2 text-right">{c.ownerLabel || '–'}</td>)}
                  </tr>
                </>
              ) : (
                <>
                  <tr>
                    <th className="text-left p-2 min-w-[200px]"></th>
                    {report.columns.map(c => (
                      <th key={c.key} className="text-right p-2 bg-blue-50 border-b border-blue-100 min-w-[140px]">
                        <div className="font-semibold text-gray-900">
                          {isAllProperties ? c.propertyName : c.yearLabel}
                        </div>
                        {isAllProperties && (
                          <div className="text-xs font-normal text-gray-500 truncate max-w-[180px] ml-auto">{c.propertyAddress}</div>
                        )}
                      </th>
                    ))}
                  </tr>
                  <tr className="bg-blue-50/60 text-xs font-medium text-gray-600">
                    <td className="p-2"></td>
                    {report.columns.map(c => (
                      <td key={c.key} className="p-2 text-right">{c.yearLabel}</td>
                    ))}
                  </tr>
                </>
              )}
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="p-2 font-medium text-gray-700">Purchase Date</td>
                {report.columns.map(c => <td key={c.key} className="p-2 text-right text-gray-500">–</td>)}
              </tr>
              <tr className="border-b border-gray-100 bg-gray-50">
                <td className="p-2 font-medium text-gray-700">Sell Date</td>
                {report.columns.map(c => <td key={c.key} className="p-2 text-right text-gray-500">–</td>)}
              </tr>
              <tr className="border-b border-gray-100">
                <td className="p-2 font-medium text-gray-700">Available On Rent</td>
                {report.columns.map(c => <td key={c.key} className="p-2 text-right text-gray-500">–</td>)}
              </tr>

              <tr className="bg-gray-100">
                <td colSpan={report.columns.length + 1} className="p-2 font-semibold text-gray-800">Income</td>
              </tr>
              {report.incomeRows.map(row => (
                <tr key={row.category} className="border-b border-gray-50">
                  <td className="p-2 text-gray-600">{row.label}</td>
                  {report.columns.map(c => (
                    <td key={c.key} className="p-2 text-right text-gray-800">{formatCurrency(row.amountsByColumn[c.key] || 0)}</td>
                  ))}
                </tr>
              ))}
              <tr className="border-t border-gray-300 font-semibold bg-gray-50">
                <td className="p-2">Gross Rent</td>
                {report.columns.map(c => (
                  <td key={c.key} className="p-2 text-right">{formatCurrency(report.grossRentByColumn[c.key] || 0)}</td>
                ))}
              </tr>

              <tr className="bg-gray-100">
                <td colSpan={report.columns.length + 1} className="p-2 font-semibold text-gray-800">Expense</td>
              </tr>
              {report.expenseRows.map(row => (
                <tr key={row.category} className="border-b border-gray-50">
                  <td className="p-2 text-gray-600">{row.label}</td>
                  {report.columns.map(c => (
                    <td key={c.key} className="p-2 text-right text-gray-800">{formatCurrency(row.amountsByColumn[c.key] || 0)}</td>
                  ))}
                </tr>
              ))}
              <tr className="border-t border-gray-300 font-semibold bg-gray-50">
                <td className="p-2">Total Expenses</td>
                {report.columns.map(c => (
                  <td key={c.key} className="p-2 text-right">{formatCurrency(report.totalExpenseByColumn[c.key] || 0)}</td>
                ))}
              </tr>

              <tr className="border-t-2 border-gray-400 font-bold">
                <td className="p-2">Net Position</td>
                {report.columns.map(c => {
                  const net = report.netByColumn[c.key] || 0;
                  return (
                    <td key={c.key} className={`p-2 text-right ${net >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {formatCurrency(net)}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
