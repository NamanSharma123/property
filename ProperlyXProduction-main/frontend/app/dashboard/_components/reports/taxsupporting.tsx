"use client";

import React from "react";

interface DownloadTaxSupportingProps {
  years: string[];
}

export default function TaxSupporting({ years }: DownloadTaxSupportingProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 max-h-[420px] overflow-auto">
      <h4 className="text-sm font-medium text-gray-700 mb-3">
        Download Tax Supportings <span className="text-blue-500 text-xs ml-2">Info</span>
      </h4>

      <div className="space-y-3">
        {years.map((y) => (
          <div key={y} className="flex tablet:flex-row items-center justify-between p-3 rounded-md bg-gray-50">
            <div className="flex items-center gap-2">
              <div className="text-sm font-medium">{y}</div>
              <div className="text-xs text-gray-500">Lock to download supporting files</div>
            </div>
            <button className="text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded-full" type="button">
              Lock
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}