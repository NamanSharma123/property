'use client';

import { categoryLabelsMap, type Transaction } from './transaction';
import type { Property } from './property';

// Australian financial year: 1 Jul – 30 Jun. "FY 25-26" -> 2025-07-01..2026-06-30.
export function getFinancialYearRange(yearLabel: string): { startDate: string; endDate: string } {
  const match = yearLabel.match(/(\d{2})-(\d{2})/);
  const startYear = match ? 2000 + parseInt(match[1], 10) : new Date().getFullYear();
  const endYear = match ? 2000 + parseInt(match[2], 10) : startYear + 1;
  return { startDate: `${startYear}-07-01`, endDate: `${endYear}-06-30` };
}

export interface ReportRow {
  category: string;
  label: string;
  amountsByProperty: Record<string, number>;
}

export interface ReportData {
  properties: Property[];
  startDate: string;
  endDate: string;
  incomeRows: ReportRow[];
  expenseRows: ReportRow[];
  totalIncomeByProperty: Record<string, number>;
  totalExpenseByProperty: Record<string, number>;
  netByProperty: Record<string, number>;
  totalIncome: number;
  totalExpense: number;
  netPosition: number;
}

/**
 * Simple income & expenditure report — sums transactions by category, per
 * property, for the given period. This is the only aggregation report does:
 * no interest/GST modelling, no allocation logic, just a sum of what was
 * already entered as transactions.
 */
export function buildIncomeExpenditureReport(
  properties: Property[],
  transactions: Transaction[],
  startDate: string,
  endDate: string
): ReportData {
  const propertyIds = new Set(properties.map(p => p.id));
  const inRange = transactions.filter(t =>
    propertyIds.has(t.propertyId) && t.date >= startDate && t.date <= endDate
  );

  const buildRows = (type: 'income' | 'expense'): ReportRow[] => {
    const categories = Object.entries(categoryLabelsMap).filter(([, info]) => info.type === type);
    return categories.map(([category, info]) => {
      const amountsByProperty: Record<string, number> = {};
      for (const property of properties) {
        amountsByProperty[property.id] = inRange
          .filter(t => t.propertyId === property.id && t.category === category && t.type === type)
          .reduce((sum, t) => sum + (t.amount || 0), 0);
      }
      return { category, label: info.label, amountsByProperty };
    }).filter(row => Object.values(row.amountsByProperty).some(v => v !== 0));
  };

  const incomeRows = buildRows('income');
  const expenseRows = buildRows('expense');

  const sumRows = (rows: ReportRow[], propertyId: string) =>
    rows.reduce((sum, row) => sum + (row.amountsByProperty[propertyId] || 0), 0);

  const totalIncomeByProperty: Record<string, number> = {};
  const totalExpenseByProperty: Record<string, number> = {};
  const netByProperty: Record<string, number> = {};

  for (const property of properties) {
    const income = sumRows(incomeRows, property.id);
    const expense = sumRows(expenseRows, property.id);
    totalIncomeByProperty[property.id] = income;
    totalExpenseByProperty[property.id] = expense;
    netByProperty[property.id] = income - expense;
  }

  const totalIncome = Object.values(totalIncomeByProperty).reduce((a, b) => a + b, 0);
  const totalExpense = Object.values(totalExpenseByProperty).reduce((a, b) => a + b, 0);

  return {
    properties,
    startDate,
    endDate,
    incomeRows,
    expenseRows,
    totalIncomeByProperty,
    totalExpenseByProperty,
    netByProperty,
    totalIncome,
    totalExpense,
    netPosition: totalIncome - totalExpense,
  };
}

export interface CostBaseRow {
  propertyId: string;
  propertyName: string;
  purchasePrice: number;
  costsByCategory: { category: string; label: string; amount: number }[];
  totalCostBase: number;
}

export interface CostBaseReport {
  asOfDate: string;
  rows: CostBaseRow[];
}

/**
 * CGT cost base as of a given date: purchase price plus every 'cost'-type
 * transaction (stamp duty, conveyancer fees, capital improvements, ...)
 * dated on or before that date. Same "just sum the transactions" approach
 * as the income & expenditure report — no indexation or other CGT
 * adjustments are applied.
 */
export function buildCostBaseReport(
  properties: Property[],
  transactions: Transaction[],
  asOfDate: string
): CostBaseReport {
  const costCategories = Object.entries(categoryLabelsMap).filter(([, info]) => info.type === 'cost');

  const rows: CostBaseRow[] = properties.map(property => {
    const propertyCostTx = transactions.filter(t =>
      t.propertyId === property.id && t.type === 'cost' && t.date <= asOfDate
    );

    const costsByCategory = costCategories
      .map(([category, info]) => ({
        category,
        label: info.label,
        amount: propertyCostTx
          .filter(t => t.category === category)
          .reduce((sum, t) => sum + (t.amount || 0), 0),
      }))
      .filter(row => row.amount !== 0);

    const purchasePrice = Number(property.purchase_price) || 0;
    const totalCostBase = purchasePrice + costsByCategory.reduce((sum, row) => sum + row.amount, 0);

    return { propertyId: property.id, propertyName: property.name, purchasePrice, costsByCategory, totalCostBase };
  });

  return { asOfDate, rows };
}

export function reportToCSV(report: ReportData): string {
  const lines: string[] = [];
  const header = ['Category', ...report.properties.map(p => p.name)];
  lines.push(header.map(csvEscape).join(','));

  lines.push(['Income'].map(csvEscape).join(','));
  for (const row of report.incomeRows) {
    lines.push([row.label, ...report.properties.map(p => (row.amountsByProperty[p.id] || 0).toFixed(2))].map(csvEscape).join(','));
  }
  lines.push(['Total Income', ...report.properties.map(p => (report.totalIncomeByProperty[p.id] || 0).toFixed(2))].map(csvEscape).join(','));

  lines.push(['Expenses'].map(csvEscape).join(','));
  for (const row of report.expenseRows) {
    lines.push([row.label, ...report.properties.map(p => (row.amountsByProperty[p.id] || 0).toFixed(2))].map(csvEscape).join(','));
  }
  lines.push(['Total Expenses', ...report.properties.map(p => (report.totalExpenseByProperty[p.id] || 0).toFixed(2))].map(csvEscape).join(','));

  lines.push(['Net Position', ...report.properties.map(p => (report.netByProperty[p.id] || 0).toFixed(2))].map(csvEscape).join(','));

  return lines.join('\n');
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}
