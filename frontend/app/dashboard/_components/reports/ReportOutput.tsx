"use client";

import React, { useMemo, useState } from "react";
import { Download, X, Filter } from "lucide-react";
import type { ReportData } from "@/lib/reports";
import { reportToCSV } from "@/lib/reports";

function formatCurrency(value: number): string {
  return value.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ReportOutput({ report, onClose, showOwnership }: { report: ReportData; onClose?: () => void; showOwnership?: boolean }) {
  // Columns are named entities (a property, or a unit) rather than years —
  // true for both All Properties and Unit Wise, which share the same
  // one-column-per-entity/one-shared-period layout.
  const isEntityColumns = report.mode === 'all-properties' || report.mode === 'unit-wise';
  const isUnitWise = report.mode === 'unit-wise';
  const isCostBase = report.reportKind === 'cost-base';
  const [showFilter, setShowFilter] = useState(false);
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(new Set());

  const allRows = useMemo(
    () => (isCostBase ? report.costRows : [...report.incomeRows, ...report.expenseRows]),
    [isCostBase, report.costRows, report.incomeRows, report.expenseRows]
  );
  const visibleIncomeRows = report.incomeRows.filter(r => !hiddenCategories.has(r.category));
  const visibleExpenseRows = report.expenseRows.filter(r => !hiddenCategories.has(r.category));
  const visibleCostRows = report.costRows.filter(r => !hiddenCategories.has(r.category));

  const toggleCategory = (category: string) => {
    setHiddenCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  const handleExportCSV = () => {
    const csv = reportToCSV(report);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    // Property/unit names often contain "/" (e.g. "2/35 Hurley St"), which breaks a filename.
    const suffix = (isEntityColumns ? report.columns[0]?.yearLabel : report.columns[0]?.propertyName) || 'report';
    const prefix = isCostBase ? 'cost-base-report' : 'income-expenditure-report';
    link.download = `${prefix}-${suffix.replace(/[\\/:*?"<>|]/g, '-')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const title = isCostBase
    ? (showOwnership ? 'Ownership Wise Cost Base Report' : isUnitWise ? 'Unit Wise Cost Base Report' : 'Cost Base Report')
    : (showOwnership ? 'Ownership Wise Report' : isUnitWise ? 'Unit Wise Report' : isEntityColumns ? 'All Properties Report' : 'Individual Property Report');

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mt-6">
      <div className="p-4 border-b flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
          <p className="text-sm text-gray-500">
            {isEntityColumns
              ? report.columns[0]?.yearLabel
              : report.columns[0]?.propertyAddress}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setShowFilter(v => !v)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50"
              type="button"
            >
              <Filter className="w-4 h-4" /> Filter{hiddenCategories.size > 0 ? ` (${allRows.length - hiddenCategories.size}/${allRows.length})` : ''}
            </button>
            {showFilter && (
              <div className="absolute right-0 z-10 mt-2 w-72 max-h-80 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-500">Show categories</span>
                  <button type="button" className="text-xs text-blue-600 hover:underline" onClick={() => setHiddenCategories(new Set())}>
                    Reset
                  </button>
                </div>
                {allRows.map(row => (
                  <label key={row.category} className="flex items-center gap-2 py-1 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!hiddenCategories.has(row.category)}
                      onChange={() => toggleCategory(row.category)}
                    />
                    {row.label}
                  </label>
                ))}
              </div>
            )}
          </div>
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
                          {isEntityColumns ? c.propertyName : c.yearLabel}
                        </div>
                        {isEntityColumns && (
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

              {isCostBase ? (
                <>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <td className="p-2 font-medium text-gray-700">Purchase Price</td>
                    {report.columns.map(c => (
                      <td key={c.key} className="p-2 text-right text-gray-800">{formatCurrency(report.purchasePriceByColumn[c.key] || 0)}</td>
                    ))}
                  </tr>
                  {visibleCostRows.map(row => (
                    <tr key={row.category} className="border-b border-gray-50">
                      <td className="p-2 text-gray-600">{row.label}</td>
                      {report.columns.map(c => (
                        <td key={c.key} className="p-2 text-right text-gray-800">{formatCurrency(row.amountsByColumn[c.key] || 0)}</td>
                      ))}
                    </tr>
                  ))}
                  <tr className="border-t-2 border-gray-400 font-bold">
                    <td className="p-2">Total Cost Base</td>
                    {report.columns.map(c => (
                      <td key={c.key} className="p-2 text-right">{formatCurrency(report.totalCostBaseByColumn[c.key] || 0)}</td>
                    ))}
                  </tr>
                </>
              ) : (
                <>
                  <tr className="bg-gray-100">
                    <td colSpan={report.columns.length + 1} className="p-2 font-semibold text-gray-800">Income</td>
                  </tr>
                  {visibleIncomeRows.map(row => (
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
                  {visibleExpenseRows.map(row => (
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
                </>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
