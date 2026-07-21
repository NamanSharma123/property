"use client";

import React from "react";
import { X } from "lucide-react";
import { getLoanSummary, getBankLabel, type Property } from "@/lib/property";

function formatCurrency(value: number): string {
  return value.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function LoanSummaryOutput({ properties, onClose }: { properties: Property[]; onClose: () => void }) {
  const rows = properties.flatMap(property => {
    const summary = getLoanSummary(property);
    if (summary.banks.length === 0) {
      return [{ propertyName: property.name, bankLabel: '—', role: '', loanAmount: 0, allocationPercent: 0, attributed: 0 }];
    }
    return summary.banks.map((bank, idx) => ({
      propertyName: idx === 0 ? property.name : '',
      bankLabel: getBankLabel(bank.bankName),
      role: idx === 0 ? 'Primary' : 'Secondary',
      loanAmount: Number(bank.loanAmount) || 0,
      allocationPercent: bank.loanAllocationPercent ? parseFloat(bank.loanAllocationPercent) : 100,
      attributed: (Number(bank.loanAmount) || 0) * ((bank.loanAllocationPercent ? parseFloat(bank.loanAllocationPercent) : 100) / 100),
    }));
  });

  const totalAttributed = rows.reduce((sum, r) => sum + r.attributed, 0);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mt-6">
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Loan Summary Report</h2>
        <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600" type="button">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="overflow-x-auto p-4">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-200">
              <th className="p-2">Property</th>
              <th className="p-2">Bank</th>
              <th className="p-2">Role</th>
              <th className="p-2">Loan Amount</th>
              <th className="p-2">Allocation %</th>
              <th className="p-2">Attributed to Property</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} className="border-b border-gray-50">
                <td className="p-2 font-medium text-gray-900">{row.propertyName}</td>
                <td className="p-2 text-gray-700">{row.bankLabel}</td>
                <td className="p-2 text-gray-500">{row.role}</td>
                <td className="p-2 text-gray-700">{row.loanAmount ? `$${formatCurrency(row.loanAmount)}` : '—'}</td>
                <td className="p-2 text-gray-700">{row.role ? `${row.allocationPercent}%` : '—'}</td>
                <td className="p-2 text-gray-900 font-medium">{row.attributed ? `$${formatCurrency(row.attributed)}` : '—'}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-gray-300 font-bold">
              <td className="p-2" colSpan={5}>Total</td>
              <td className="p-2">${formatCurrency(totalAttributed)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
