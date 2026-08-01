'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { documentsApi } from '@/lib/api';
import type { DepreciationSchedule } from '@/lib/depreciation';

function formatFinancialDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}-${m}-${y}`;
}

function formatAmount(value: string): string {
  const num = parseFloat(value);
  return `$${(Number.isFinite(num) ? num : 0).toFixed(2)}`;
}

export default function DepreciationScheduleModal({
  schedule,
  onClose,
}: {
  schedule: DepreciationSchedule;
  onClose: () => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [method, setMethod] = useState<'diminishing_value' | 'prime_cost'>('diminishing_value');

  useEffect(() => {
    let cancelled = false;
    documentsApi.getViewUrl(schedule.file_url).then(result => {
      if (!cancelled && result.success && result.data?.url) {
        setPreviewUrl(result.data.url);
      }
    });
    return () => { cancelled = true; };
  }, [schedule.file_url]);

  const rows = schedule.years[method];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Depreciation Item(s)</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" type="button">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 overflow-hidden">
          <div className="border rounded-lg overflow-hidden bg-gray-100">
            {previewUrl ? (
              <iframe src={previewUrl} className="w-full h-full" title={schedule.file_name} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm text-gray-500">
                Loading preview…
              </div>
            )}
          </div>

          <div className="flex flex-col overflow-hidden">
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => setMethod('diminishing_value')}
                className={`px-4 py-1.5 rounded-full text-sm border ${method === 'diminishing_value'
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'bg-white border-gray-200 text-gray-600'
                  }`}
              >
                Diminishing Value
              </button>
              <button
                type="button"
                onClick={() => setMethod('prime_cost')}
                className={`px-4 py-1.5 rounded-full text-sm border ${method === 'prime_cost'
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'bg-white border-gray-200 text-gray-600'
                  }`}
              >
                Prime Cost
              </button>
            </div>

            <div className="flex-1 overflow-y-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-blue-50">
                  <tr>
                    <th className="text-left px-4 py-2 font-semibold text-gray-900">Financial Date</th>
                    <th className="text-right px-4 py-2 font-semibold text-gray-900">Division 40</th>
                    <th className="text-right px-4 py-2 font-semibold text-gray-900">Division 43</th>
                    <th className="text-right px-4 py-2 font-semibold text-gray-900">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center px-4 py-8 text-gray-500">
                        No {method === 'diminishing_value' ? 'Diminishing Value' : 'Prime Cost'} rows in this schedule.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row, idx) => (
                      <tr key={row.id} className={idx % 2 === 1 ? 'bg-gray-50' : ''}>
                        <td className="px-4 py-2 text-gray-700 border-t">{formatFinancialDate(row.financial_date)}</td>
                        <td className="px-4 py-2 text-right text-gray-800 border-t">{formatAmount(row.division_40_amount)}</td>
                        <td className="px-4 py-2 text-right text-gray-800 border-t">{formatAmount(row.division_43_amount)}</td>
                        <td className="px-4 py-2 text-right font-medium text-gray-900 border-t">{formatAmount(row.total_amount)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
