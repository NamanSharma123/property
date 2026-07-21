"use client";

import React from "react";
import { X } from "lucide-react";
import type { CostBaseReport } from "@/lib/reports";

function formatCurrency(value: number): string {
  return value.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function CostBaseOutput({ report, onClose }: { report: CostBaseReport; onClose: () => void }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mt-6">
      <div className="p-4 border-b flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Cost Base Report</h2>
          <p className="text-sm text-gray-500">As of {report.asOfDate}</p>
        </div>
        <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600" type="button">
          <X className="w-4 h-4" />
        </button>
      </div>

      {report.rows.length === 0 ? (
        <div className="p-8 text-center text-gray-500 text-sm">No properties selected.</div>
      ) : (
        <div className="divide-y divide-gray-100">
          {report.rows.map(row => (
            <div key={row.propertyId} className="p-4">
              <h3 className="font-semibold text-gray-900 mb-2">{row.propertyName}</h3>
              <table className="w-full text-sm border-collapse">
                <tbody>
                  <tr className="border-b border-gray-50">
                    <td className="p-2 text-gray-600">Purchase Price</td>
                    <td className="p-2 text-right text-gray-800">${formatCurrency(row.purchasePrice)}</td>
                  </tr>
                  {row.costsByCategory.map(c => (
                    <tr key={c.category} className="border-b border-gray-50">
                      <td className="p-2 text-gray-600">{c.label}</td>
                      <td className="p-2 text-right text-gray-800">${formatCurrency(c.amount)}</td>
                    </tr>
                  ))}
                  {row.costsByCategory.length === 0 && (
                    <tr>
                      <td colSpan={2} className="p-2 text-gray-400 italic">No capital costs recorded</td>
                    </tr>
                  )}
                  <tr className="border-t-2 border-gray-300 font-bold">
                    <td className="p-2">Total Cost Base</td>
                    <td className="p-2 text-right">${formatCurrency(row.totalCostBase)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
