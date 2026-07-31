'use client';

import { categoryLabelsMap, type Transaction } from './transaction';
import { getOwnershipInfo } from './property';

// Minimal structural shape the report builders need — deliberately not the
// full Property type, so callers with their own local property type (e.g.
// PropertyDashboard's PropertyData) can pass through without conversion.
export interface ReportProperty {
  id: string;
  name: string;
  full_address?: string;
  address?: { street?: string; city?: string; state?: string; zipCode?: string } | string;
  purchase_price?: number;
  current_value?: number;
  marketValue?: number | string;
  ownership?: string;
  ownershipDetails?: unknown;
  ownership_details?: unknown;
}

// Australian financial year: 1 Jul – 30 Jun. "FY 25-26" -> 2025-07-01..2026-06-30.
export function getFinancialYearRange(yearLabel: string): { startDate: string; endDate: string } {
  const match = yearLabel.match(/(\d{2})-(\d{2})/);
  const startYear = match ? 2000 + parseInt(match[1], 10) : new Date().getFullYear();
  const endYear = match ? 2000 + parseInt(match[2], 10) : startYear + 1;
  return { startDate: `${startYear}-07-01`, endDate: `${endYear}-06-30` };
}

export function getCurrentFinancialYearLabel(referenceDate: Date = new Date()): string {
  const year = referenceDate.getFullYear();
  const fyStartYear = referenceDate.getMonth() >= 6 ? year : year - 1; // FY starts July (month index 6)
  return `FY ${String(fyStartYear).slice(-2)}-${String(fyStartYear + 1).slice(-2)}`;
}

// [current, current-1, current-2, ...] — most recent first, matching how the
// Individual Property Report compares a single property across recent years.
export function getRecentFinancialYearLabels(count: number, anchor: string = getCurrentFinancialYearLabel()): string[] {
  const match = anchor.match(/(\d{2})-(\d{2})/);
  const startYear = match ? 2000 + parseInt(match[1], 10) : new Date().getFullYear();
  return Array.from({ length: count }, (_, i) => {
    const y = startYear - i;
    return `FY ${String(y).slice(-2)}-${String(y + 1).slice(-2)}`;
  });
}

function getPropertyAddress(property: ReportProperty): string {
  if (property.full_address) return property.full_address;
  if (property.address && typeof property.address === 'object') {
    return [property.address.street, property.address.city, property.address.state, property.address.zipCode]
      .filter(Boolean).join(', ');
  }
  return String(property.address || '');
}

export interface ReportPeriod {
  /** Column header for this period, e.g. "FY 25-26" or "01/01/2026 - 30/06/2026". */
  label: string;
  startDate: string;
  endDate: string;
}

export function financialYearPeriod(yearLabel: string): ReportPeriod {
  return { label: yearLabel, ...getFinancialYearRange(yearLabel) };
}

export function customDatePeriod(startDate: string, endDate: string): ReportPeriod {
  const fmt = (d: string) => {
    const [y, m, day] = d.split('-');
    return y && m && day ? `${day}/${m}/${y}` : d;
  };
  return { label: `${fmt(startDate)} - ${fmt(endDate)}`, startDate, endDate };
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// monthValue is "YYYY-MM", the native <input type="month"> value format.
export function monthPeriod(monthValue: string): ReportPeriod {
  const [yearStr, monthStr] = monthValue.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10); // 1-12
  const lastDay = new Date(year, month, 0).getDate();
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    label: `${MONTH_NAMES[month - 1]} ${year}`,
    startDate: `${yearStr}-${pad(month)}-01`,
    endDate: `${yearStr}-${pad(month)}-${pad(lastDay)}`,
  };
}

export interface ReportColumn {
  key: string;
  propertyId: string;
  propertyName: string;
  propertyAddress: string;
  yearLabel: string;
  startDate: string;
  endDate: string;
  /** e.g. "Family Trust" */
  ownershipTypeLabel: string;
  /** e.g. "Addi and Shah (100.00%)" */
  ownerLabel: string;
  purchasePrice: number;
  /** Unit Wise Report only — restricts this column to transactions tagged with this unit. */
  unitLabel?: string;
}

export interface ReportRow {
  category: string;
  label: string;
  amountsByColumn: Record<string, number>;
}

export type ReportKind = 'income-expenditure' | 'cost-base';

export interface ReportData {
  /** "all-properties": one column per property (same period). "individual-property": one column per year (same property). "unit-wise": one column per unit (same property, same period). */
  mode: 'all-properties' | 'individual-property' | 'unit-wise';
  reportKind: ReportKind;
  columns: ReportColumn[];
  // Income & Expenditure
  incomeRows: ReportRow[];
  expenseRows: ReportRow[];
  grossRentByColumn: Record<string, number>;
  totalExpenseByColumn: Record<string, number>;
  netByColumn: Record<string, number>;
  // Cost Base — purchase price is a category-less leading row; the total
  // folds it in alongside every 'cost'-type category row.
  costRows: ReportRow[];
  purchasePriceByColumn: Record<string, number>;
  totalCostBaseByColumn: Record<string, number>;
}

/**
 * Sums transactions (or, for Cost Base, purchase price) by category, per
 * column, for that column's period. This is the only aggregation report
 * does: no interest/GST modelling, no allocation logic, just a sum of what
 * was already entered as transactions. Every category row is included
 * (even all-zero ones) so the row list is stable across periods/properties.
 * Expense/Cost rows are alphabetical; income rows keep Rental Income first
 * since it's the primary line, then supplementary income types. Income &
 * Expenditure and Cost Base are otherwise the exact same report, just
 * filtered to a different category type — see ReportOutput.tsx.
 */
function buildReportFromColumns(
  columns: ReportColumn[],
  transactions: Transaction[],
  mode: ReportData['mode'],
  reportKind: ReportKind
): ReportData {
  const buildRows = (type: 'income' | 'expense' | 'cost'): ReportRow[] => {
    const categories = Object.entries(categoryLabelsMap).filter(([, info]) => info.type === type);
    const ordered = type === 'income' ? categories : [...categories].sort((a, b) => a[1].label.localeCompare(b[1].label));

    return ordered.map(([category, info]) => {
      const amountsByColumn: Record<string, number> = {};
      for (const col of columns) {
        amountsByColumn[col.key] = transactions
          .filter(t =>
            t.propertyId === col.propertyId && t.category === category && t.type === type &&
            t.date >= col.startDate && t.date <= col.endDate &&
            (col.unitLabel === undefined || t.unitLabel === col.unitLabel)
          )
          .reduce((sum, t) => sum + (t.amount || 0), 0);
      }
      return { category, label: info.label, amountsByColumn };
    });
  };

  const sumRows = (rows: ReportRow[], key: string) =>
    rows.reduce((sum, row) => sum + (row.amountsByColumn[key] || 0), 0);

  if (reportKind === 'cost-base') {
    const costRows = buildRows('cost');
    const purchasePriceByColumn: Record<string, number> = {};
    const totalCostBaseByColumn: Record<string, number> = {};
    for (const col of columns) {
      purchasePriceByColumn[col.key] = col.purchasePrice;
      totalCostBaseByColumn[col.key] = col.purchasePrice + sumRows(costRows, col.key);
    }
    return {
      mode, reportKind, columns,
      incomeRows: [], expenseRows: [], grossRentByColumn: {}, totalExpenseByColumn: {}, netByColumn: {},
      costRows, purchasePriceByColumn, totalCostBaseByColumn,
    };
  }

  const incomeRows = buildRows('income');
  const expenseRows = buildRows('expense');
  const grossRentByColumn: Record<string, number> = {};
  const totalExpenseByColumn: Record<string, number> = {};
  const netByColumn: Record<string, number> = {};

  for (const col of columns) {
    const income = sumRows(incomeRows, col.key);
    const expense = sumRows(expenseRows, col.key);
    grossRentByColumn[col.key] = income;
    totalExpenseByColumn[col.key] = expense;
    netByColumn[col.key] = income - expense;
  }

  return {
    mode, reportKind, columns, incomeRows, expenseRows, grossRentByColumn, totalExpenseByColumn, netByColumn,
    costRows: [], purchasePriceByColumn: {}, totalCostBaseByColumn: {},
  };
}

/** All Properties Report: one column per property, all for the same period (a financial year or a custom date range). */
export function buildAllPropertiesReport(
  properties: ReportProperty[],
  transactions: Transaction[],
  period: ReportPeriod,
  reportKind: ReportKind = 'income-expenditure'
): ReportData {
  const columns: ReportColumn[] = properties.map(p => {
    const ownership = getOwnershipInfo(p);
    return {
      key: p.id,
      propertyId: p.id,
      propertyName: p.name,
      propertyAddress: getPropertyAddress(p),
      yearLabel: period.label,
      startDate: period.startDate,
      endDate: period.endDate,
      ownershipTypeLabel: ownership.typeLabel,
      ownerLabel: ownership.ownerLabel,
      purchasePrice: Number(p.purchase_price) || 0,
    };
  });
  return buildReportFromColumns(columns, transactions, 'all-properties', reportKind);
}

/** Individual Property Report: one column per period (financial years, or a single custom date range), for a single property. */
export function buildIndividualPropertyReport(
  property: ReportProperty,
  transactions: Transaction[],
  periods: ReportPeriod[],
  reportKind: ReportKind = 'income-expenditure'
): ReportData {
  const ownership = getOwnershipInfo(property);
  const purchasePrice = Number(property.purchase_price) || 0;
  const columns: ReportColumn[] = periods.map((period, i) => ({
    key: `${period.label}-${i}`,
    propertyId: property.id,
    propertyName: property.name,
    propertyAddress: getPropertyAddress(property),
    yearLabel: period.label,
    startDate: period.startDate,
    endDate: period.endDate,
    ownershipTypeLabel: ownership.typeLabel,
    ownerLabel: ownership.ownerLabel,
    purchasePrice,
  }));
  return buildReportFromColumns(columns, transactions, 'individual-property', reportKind);
}

/**
 * Unit Wise Report: one column per unit of a single multi-unit property, all
 * for the same period — same shape as the All Properties Report, just with
 * "unit" standing in for "property". unitLabels is the property's own set of
 * units (see getUnitLabelsForProperty); transactions are matched to a column
 * via ReportColumn.unitLabel, same as every other column matches on propertyId.
 */
export function buildUnitWiseReport(
  property: ReportProperty,
  unitLabels: string[],
  transactions: Transaction[],
  period: ReportPeriod,
  reportKind: ReportKind = 'income-expenditure'
): ReportData {
  const ownership = getOwnershipInfo(property);
  const purchasePrice = Number(property.purchase_price) || 0;
  const baseAddress = getPropertyAddress(property);
  const columns: ReportColumn[] = unitLabels.map(unit => ({
    key: unit,
    propertyId: property.id,
    propertyName: `Unit ${unit}`,
    propertyAddress: baseAddress ? `${unit}/${baseAddress}` : `Unit ${unit}`,
    yearLabel: period.label,
    startDate: period.startDate,
    endDate: period.endDate,
    ownershipTypeLabel: ownership.typeLabel,
    ownerLabel: ownership.ownerLabel,
    purchasePrice,
    unitLabel: unit,
  }));
  return buildReportFromColumns(columns, transactions, 'unit-wise', reportKind);
}

/** Widest startDate/endDate spanning every column, for a single transactions fetch. */
export function getReportDateSpan(columns: ReportColumn[]): { startDate: string; endDate: string } {
  const startDate = columns.reduce((min, c) => (c.startDate < min ? c.startDate : min), columns[0]?.startDate || '');
  const endDate = columns.reduce((max, c) => (c.endDate > max ? c.endDate : max), columns[0]?.endDate || '');
  return { startDate, endDate };
}

export function reportToCSV(report: ReportData): string {
  const lines: string[] = [];
  const columnTitle = (c: ReportColumn) => report.mode === 'individual-property' ? c.yearLabel : c.propertyName;

  lines.push(['Category', ...report.columns.map(columnTitle)].map(csvEscape).join(','));

  if (report.reportKind === 'cost-base') {
    lines.push(['Purchase Price', ...report.columns.map(c => (report.purchasePriceByColumn[c.key] || 0).toFixed(2))].map(csvEscape).join(','));
    for (const row of report.costRows) {
      lines.push([row.label, ...report.columns.map(c => (row.amountsByColumn[c.key] || 0).toFixed(2))].map(csvEscape).join(','));
    }
    lines.push(['Total Cost Base', ...report.columns.map(c => (report.totalCostBaseByColumn[c.key] || 0).toFixed(2))].map(csvEscape).join(','));
    return lines.join('\n');
  }

  lines.push(['Income'].map(csvEscape).join(','));
  for (const row of report.incomeRows) {
    lines.push([row.label, ...report.columns.map(c => (row.amountsByColumn[c.key] || 0).toFixed(2))].map(csvEscape).join(','));
  }
  lines.push(['Gross Rent', ...report.columns.map(c => (report.grossRentByColumn[c.key] || 0).toFixed(2))].map(csvEscape).join(','));

  lines.push(['Expenses'].map(csvEscape).join(','));
  for (const row of report.expenseRows) {
    lines.push([row.label, ...report.columns.map(c => (row.amountsByColumn[c.key] || 0).toFixed(2))].map(csvEscape).join(','));
  }
  lines.push(['Total Expenses', ...report.columns.map(c => (report.totalExpenseByColumn[c.key] || 0).toFixed(2))].map(csvEscape).join(','));

  lines.push(['Net Position', ...report.columns.map(c => (report.netByColumn[c.key] || 0).toFixed(2))].map(csvEscape).join(','));

  return lines.join('\n');
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}
