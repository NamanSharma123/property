"use client";

import React, { useEffect, useMemo, useState } from "react";
import { X, Filter, RotateCcw, Download, Settings } from "lucide-react";
import { getLoanSummary, getBankLabel, type Property, type LoanBankDetail } from "@/lib/property";

function formatCurrency(value: number): string {
  return value.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(value?: string): string {
  if (!value) return '–';
  const [y, m, d] = value.split('-');
  return y && m && d ? `${d}/${m}/${y}` : value;
}

const LOAN_TYPE_LABELS: Record<string, string> = {
  'principal-interest': 'Principal & Interest',
  'interest-only': 'Interest Only',
};

const INTEREST_TYPE_LABELS: Record<string, string> = {
  'fixed': 'Fixed',
  'variable': 'Variable',
};

interface ColumnDef {
  key: string;
  label: string;
  defaultVisible: boolean;
}

const COLUMNS: ColumnDef[] = [
  { key: 'bank', label: 'Bank', defaultVisible: true },
  { key: 'loanAccountNumber', label: 'Loan Account Number', defaultVisible: true },
  { key: 'interestType', label: 'Interest Type', defaultVisible: false },
  { key: 'loanType', label: 'Loan Type', defaultVisible: false },
  { key: 'productName', label: 'Product Name', defaultVisible: false },
  { key: 'startDate', label: 'Start Date', defaultVisible: false },
  { key: 'endDate', label: 'End Date', defaultVisible: false },
  { key: 'interestRate', label: 'Interest Rate', defaultVisible: false },
  { key: 'loanAmount', label: 'Loan Amount $$', defaultVisible: false },
  { key: 'marketValue', label: 'Market Value $$', defaultVisible: true },
  { key: 'netEquity', label: 'Net Equity $$', defaultVisible: true },
  { key: 'lvr', label: 'Security LVR', defaultVisible: true },
  { key: 'propertySecurity', label: 'Property Security', defaultVisible: true },
  { key: 'repayment', label: 'Repayment $$', defaultVisible: true },
  { key: 'redraw', label: 'Redraw $$', defaultVisible: true },
  { key: 'fixedInterestExpiry', label: 'Fixed Interest Expiry', defaultVisible: true },
];

const COLUMN_PREFS_KEY = 'properly.loanSummaryColumns';

function loadColumnPrefs(): Set<string> {
  if (typeof window === 'undefined') return new Set(COLUMNS.filter(c => c.defaultVisible).map(c => c.key));
  try {
    const raw = window.localStorage.getItem(COLUMN_PREFS_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch { /* ignore malformed prefs */ }
  return new Set(COLUMNS.filter(c => c.defaultVisible).map(c => c.key));
}

interface LoanRow {
  propertyId: string;
  propertyName: string;
  role: string;
  bank: LoanBankDetail;
  marketValue: number;
  netEquity: number;
  lvr: number;
}

export default function LoanSummaryOutput({ properties, onClose }: { properties: Property[]; onClose: () => void }) {
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => loadColumnPrefs());
  const [pendingColumns, setPendingColumns] = useState<Set<string>>(visibleColumns);
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [hiddenPropertyIds, setHiddenPropertyIds] = useState<Set<string>>(new Set());
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (showColumnSettings) setPendingColumns(new Set(visibleColumns));
  }, [showColumnSettings, visibleColumns]);

  const allRows: LoanRow[] = useMemo(() => {
    void reloadKey;
    return properties
      .filter(p => !hiddenPropertyIds.has(p.id))
      .flatMap(property => {
        const summary = getLoanSummary(property);
        return summary.banks.map((bank, idx) => ({
          propertyId: property.id,
          propertyName: property.name,
          role: idx === 0 ? 'Primary' : 'Secondary',
          bank,
          marketValue: summary.banks.length ? (Number(property.current_value) || Number(property.marketValue) || 0) : 0,
          netEquity: summary.netEquity,
          lvr: summary.lvr,
        }));
      });
  }, [properties, hiddenPropertyIds, reloadKey]);

  const applyColumnSettings = (columns: Set<string>) => {
    setVisibleColumns(columns);
    setShowColumnSettings(false);
  };

  const persistAsDefault = (columns: Set<string>) => {
    try {
      window.localStorage.setItem(COLUMN_PREFS_KEY, JSON.stringify(Array.from(columns)));
    } catch { /* ignore storage errors (e.g. private browsing) */ }
  };

  const handleExportCSV = () => {
    const cols = COLUMNS.filter(c => visibleColumns.has(c.key));
    const header = ['Property', ...cols.map(c => c.label)];
    const lines = [header];
    for (const row of allRows) {
      const cells: Record<string, string> = {
        bank: getBankLabel(row.bank.bankName),
        loanAccountNumber: row.bank.loanAccountNumber || '',
        interestType: INTEREST_TYPE_LABELS[row.bank.interestType || ''] || '',
        loanType: LOAN_TYPE_LABELS[row.bank.loanType || ''] || '',
        productName: row.bank.productName || '',
        startDate: formatDate(row.bank.startDate),
        endDate: formatDate(row.bank.endDate),
        interestRate: row.bank.interestRate ? `${row.bank.interestRate}%` : '',
        loanAmount: formatCurrency(Number(row.bank.loanAmount) || 0),
        marketValue: formatCurrency(row.marketValue),
        netEquity: formatCurrency(row.netEquity),
        lvr: `${row.lvr.toFixed(0)}%`,
        propertySecurity: row.propertyName,
        repayment: row.bank.repaymentAmount ? formatCurrency(Number(row.bank.repaymentAmount)) : '',
        redraw: row.bank.redrawAmount ? formatCurrency(Number(row.bank.redrawAmount)) : '',
        fixedInterestExpiry: formatDate(row.bank.fixedInterestExpiry),
      };
      lines.push([row.propertyName, ...cols.map(c => cells[c.key] || '')]);
    }
    const csv = lines.map(line => line.map(v => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)).join(',')).join('\n');
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = 'loan-summary-report.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const isVisible = (key: string) => visibleColumns.has(key);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mt-6">
      <div className="p-4 border-b flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold text-gray-800">Loan Summary Report</h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setShowFilter(v => !v)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50"
              type="button"
            >
              <Filter className="w-4 h-4" /> Filter
            </button>
            {showFilter && (
              <div className="absolute right-0 z-10 mt-2 w-64 max-h-72 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-500">Show properties</span>
                  <button type="button" className="text-xs text-blue-600 hover:underline" onClick={() => setHiddenPropertyIds(new Set())}>
                    Reset
                  </button>
                </div>
                {properties.map(p => (
                  <label key={p.id} className="flex items-center gap-2 py-1 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!hiddenPropertyIds.has(p.id)}
                      onChange={() => setHiddenPropertyIds(prev => {
                        const next = new Set(prev);
                        if (next.has(p.id)) next.delete(p.id); else next.add(p.id);
                        return next;
                      })}
                    />
                    {p.name}
                  </label>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => setReloadKey(k => k + 1)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-400 text-gray-900 text-sm font-medium hover:bg-yellow-500"
            type="button"
          >
            <RotateCcw className="w-4 h-4" /> Reload
          </button>
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600 text-white text-sm font-medium"
            type="button"
          >
            <Download className="w-4 h-4" /> Export As
          </button>
          <button
            onClick={() => setShowColumnSettings(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50"
            type="button"
          >
            <Settings className="w-4 h-4" /> Columns Setting
          </button>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600" type="button">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {allRows.length === 0 ? (
        <div className="p-8 text-center text-gray-500 text-sm">No loans added yet.</div>
      ) : (
        <div className="overflow-x-auto p-4">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200 bg-blue-50">
                {isVisible('bank') && <th className="p-2">Bank</th>}
                {isVisible('loanAccountNumber') && <th className="p-2">Loan Account Number</th>}
                {isVisible('interestType') && <th className="p-2">Interest Type</th>}
                {isVisible('loanType') && <th className="p-2">Loan Type</th>}
                {isVisible('productName') && <th className="p-2">Product Name</th>}
                {isVisible('startDate') && <th className="p-2">Start Date</th>}
                {isVisible('endDate') && <th className="p-2">End Date</th>}
                {isVisible('interestRate') && <th className="p-2">Interest Rate</th>}
                {isVisible('loanAmount') && <th className="p-2 text-right">Loan Amount $$</th>}
                {isVisible('marketValue') && <th className="p-2 text-right">Market Value $$</th>}
                {isVisible('netEquity') && <th className="p-2 text-right">Net Equity $$</th>}
                {isVisible('lvr') && <th className="p-2 text-right">Security LVR</th>}
                {isVisible('propertySecurity') && <th className="p-2">Property Security</th>}
                {isVisible('repayment') && <th className="p-2 text-right">Repayment $$</th>}
                {isVisible('redraw') && <th className="p-2 text-right">Redraw $$</th>}
                {isVisible('fixedInterestExpiry') && <th className="p-2">Fixed Interest Expiry</th>}
              </tr>
            </thead>
            <tbody>
              {allRows.map((row, idx) => (
                <tr key={idx} className="border-b border-gray-50">
                  {isVisible('bank') && (
                    <td className="p-2 font-medium text-gray-900">
                      {getBankLabel(row.bank.bankName)}
                      <span className={`ml-2 text-xs font-medium px-2 py-0.5 rounded-full ${row.role === 'Primary' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'}`}>
                        {row.role}
                      </span>
                    </td>
                  )}
                  {isVisible('loanAccountNumber') && <td className="p-2 text-gray-700">{row.bank.loanAccountNumber ? `XXXXXX-XXXXX${row.bank.loanAccountNumber.slice(-4)}` : '–'}</td>}
                  {isVisible('interestType') && <td className="p-2 text-gray-700">{INTEREST_TYPE_LABELS[row.bank.interestType || ''] || '–'}</td>}
                  {isVisible('loanType') && <td className="p-2 text-gray-700">{LOAN_TYPE_LABELS[row.bank.loanType || ''] || '–'}</td>}
                  {isVisible('productName') && <td className="p-2 text-gray-700">{row.bank.productName || '–'}</td>}
                  {isVisible('startDate') && <td className="p-2 text-gray-700">{formatDate(row.bank.startDate)}</td>}
                  {isVisible('endDate') && <td className="p-2 text-gray-700">{formatDate(row.bank.endDate)}</td>}
                  {isVisible('interestRate') && <td className="p-2 text-gray-700">{row.bank.interestRate ? `${row.bank.interestRate}%` : '–'}</td>}
                  {isVisible('loanAmount') && <td className="p-2 text-right text-gray-700">{formatCurrency(Number(row.bank.loanAmount) || 0)}</td>}
                  {isVisible('marketValue') && <td className="p-2 text-right text-gray-700">{formatCurrency(row.marketValue)}</td>}
                  {isVisible('netEquity') && <td className="p-2 text-right text-gray-700">{formatCurrency(row.netEquity)}</td>}
                  {isVisible('lvr') && <td className="p-2 text-right text-gray-700">{row.lvr.toFixed(0)}%</td>}
                  {isVisible('propertySecurity') && <td className="p-2 text-gray-700">{row.propertyName}</td>}
                  {isVisible('repayment') && <td className="p-2 text-right text-gray-700">{row.bank.repaymentAmount ? formatCurrency(Number(row.bank.repaymentAmount)) : '–'}</td>}
                  {isVisible('redraw') && <td className="p-2 text-right text-gray-700">{row.bank.redrawAmount ? formatCurrency(Number(row.bank.redrawAmount)) : '–'}</td>}
                  {isVisible('fixedInterestExpiry') && <td className="p-2 text-gray-700">{formatDate(row.bank.fixedInterestExpiry)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showColumnSettings && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Column Settings «Loan Overview»</h3>
              <button onClick={() => setShowColumnSettings(false)} className="text-gray-400 hover:text-gray-600" type="button">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {COLUMNS.map(col => (
                <label key={col.key} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 text-sm text-gray-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pendingColumns.has(col.key)}
                    onChange={() => setPendingColumns(prev => {
                      const next = new Set(prev);
                      if (next.has(col.key)) next.delete(col.key); else next.add(col.key);
                      return next;
                    })}
                  />
                  {col.label}
                </label>
              ))}
            </div>
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-4 text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pendingColumns.size === COLUMNS.length}
                    onChange={(e) => setPendingColumns(e.target.checked ? new Set(COLUMNS.map(c => c.key)) : new Set())}
                  />
                  Select All
                </label>
                <button type="button" className="text-gray-600 hover:underline" onClick={() => setPendingColumns(new Set())}>
                  Select None
                </button>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50"
                  onClick={() => { persistAsDefault(pendingColumns); applyColumnSettings(pendingColumns); }}
                >
                  Set as Default
                </button>
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
                  onClick={() => applyColumnSettings(pendingColumns)}
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
