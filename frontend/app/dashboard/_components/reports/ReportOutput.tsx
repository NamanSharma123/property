"use client";

import React from "react";
import { Download, X } from "lucide-react";
import type { ReportData } from "@/lib/reports";
import { reportToCSV } from "@/lib/reports";

function formatCurrency(value: number): string {
  return value.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ReportOutput({ report, onClose }: { report: ReportData; onClose: () => void }) {
  const handleExportCSV = () => {
    const csv = reportToCSV(report);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `income-expenditure-report-${report.startDate}-to-${report.endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mt-6">
      <div className="p-4 border-b flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Income & Expenditure Report</h2>
          <p className="text-sm text-gray-500">{report.startDate} to {report.endDate}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600 text-white text-sm font-medium"
            type="button"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600" type="button">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Total for all properties summary strip */}
      <div className="m-4 bg-blue-50 rounded-lg p-6 flex flex-wrap items-center justify-around gap-4 text-center">
        <div>
          <div className="text-sm text-gray-500 mb-1">Income</div>
          <div className="text-2xl font-bold text-gray-900">${formatCurrency(report.totalIncome)}</div>
        </div>
        <div className="text-2xl text-gray-400">-</div>
        <div>
          <div className="text-sm text-gray-500 mb-1">Expenses</div>
          <div className="text-2xl font-bold text-red-600">${formatCurrency(report.totalExpense)}</div>
        </div>
        <div className="text-2xl text-gray-400">=</div>
        <div>
          <div className="text-sm text-gray-500 mb-1">Net Position</div>
          <div className={`text-2xl font-bold ${report.netPosition >= 0 ? "text-green-600" : "text-red-600"}`}>
            ${formatCurrency(report.netPosition)}
          </div>
        </div>
      </div>

      {report.properties.length === 0 ? (
        <div className="p-8 text-center text-gray-500 text-sm">No properties selected.</div>
      ) : (
        <div className="overflow-x-auto p-4">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="text-left p-2 border-b border-gray-200 min-w-[180px]"></th>
                {report.properties.map(p => (
                  <th key={p.id} className="text-left p-2 border-b border-gray-200 min-w-[140px]">
                    <div className="font-semibold text-gray-900">{p.name}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={report.properties.length + 1} className="pt-4 pb-1 px-2 font-semibold text-gray-700">Income</td>
              </tr>
              {report.incomeRows.length === 0 && (
                <tr><td colSpan={report.properties.length + 1} className="px-2 py-2 text-gray-400 italic">No income transactions in this period</td></tr>
              )}
              {report.incomeRows.map(row => (
                <tr key={row.category} className="border-b border-gray-50">
                  <td className="p-2 text-gray-600">{row.label}</td>
                  {report.properties.map(p => (
                    <td key={p.id} className="p-2 text-gray-800">{formatCurrency(row.amountsByProperty[p.id] || 0)}</td>
                  ))}
                </tr>
              ))}
              <tr className="border-t border-gray-200 font-semibold">
                <td className="p-2">Total Income</td>
                {report.properties.map(p => (
                  <td key={p.id} className="p-2">{formatCurrency(report.totalIncomeByProperty[p.id] || 0)}</td>
                ))}
              </tr>

              <tr>
                <td colSpan={report.properties.length + 1} className="pt-6 pb-1 px-2 font-semibold text-gray-700">Expenses</td>
              </tr>
              {report.expenseRows.length === 0 && (
                <tr><td colSpan={report.properties.length + 1} className="px-2 py-2 text-gray-400 italic">No expense transactions in this period</td></tr>
              )}
              {report.expenseRows.map(row => (
                <tr key={row.category} className="border-b border-gray-50">
                  <td className="p-2 text-gray-600">{row.label}</td>
                  {report.properties.map(p => (
                    <td key={p.id} className="p-2 text-gray-800">{formatCurrency(row.amountsByProperty[p.id] || 0)}</td>
                  ))}
                </tr>
              ))}
              <tr className="border-t border-gray-200 font-semibold">
                <td className="p-2">Total Expenses</td>
                {report.properties.map(p => (
                  <td key={p.id} className="p-2">{formatCurrency(report.totalExpenseByProperty[p.id] || 0)}</td>
                ))}
              </tr>

              <tr className="border-t-2 border-gray-300 font-bold">
                <td className="p-2">Net Position</td>
                {report.properties.map(p => (
                  <td key={p.id} className={`p-2 ${(report.netByProperty[p.id] || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {formatCurrency(report.netByProperty[p.id] || 0)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
