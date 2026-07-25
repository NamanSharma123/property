'use client';

import { transactionsApi, propertiesApi } from './api';

// Transaction interface for backwards compatibility
export interface Transaction {
  id: string;
  propertyId: string;
  propertyName?: string;
  propertyType?: string;
  category: string;
  categoryLabel?: string;
  type: 'income' | 'expense' | 'cost';
  amount: number;
  date: string;
  transactionSource?: 'Manual Entry' | 'Rental Summary' | 'Bank Feed' | 'OCR Upload';
  description?: string;
  statementDate?: string;
  startDate?: string;
  endDate?: string;
  createdAt?: string;
}

// Category mapping - organized by Income, Expense, and Cost
export const categoryLabelsMap: Record<string, { label: string; type: 'income' | 'expense' | 'cost' }> = {
  // ============ INCOME CATEGORIES ============
  'rental-income': { label: 'Rental Income', type: 'income' },
  'other-rental-income': { label: 'Other rental related income', type: 'income' },
  'variable-outgoings-received': { label: 'Variable Outgoings Received', type: 'income' },
  'insurance-recoveries': { label: 'Insurance Recoveries', type: 'income' },
  'booking-short-stay-income': { label: 'Booking / Short Stay Income', type: 'income' },

  // ============ EXPENSE CATEGORIES ============
  'council-rates': { label: 'Council rates', type: 'expense' },
  'water-rates': { label: 'Water Rates', type: 'expense' },
  'gardening': { label: 'Gardening', type: 'expense' },
  'accounting-legal': { label: 'Accounting & Legal Expense', type: 'expense' },
  'pest-control': { label: 'Pest Control', type: 'expense' },
  'management-fees': { label: 'Management fees', type: 'expense' },
  'property-agent-fees': { label: 'Property agent other fees', type: 'expense' },
  'adjustment-at-purchase': { label: 'Adjustment at purchase', type: 'expense' },
  'gas-electricity': { label: 'Gas and Electricity', type: 'expense' },
  'repairs-maintenance': { label: 'Repair & Maintenance', type: 'expense' },
  'land-tax': { label: 'Land Tax', type: 'expense' },
  'sundry-rental-expenses': { label: 'Sundry rental expenses', type: 'expense' },
  'depreciation': { label: 'Depreciation (from Schedule)', type: 'expense' },
  'interest-on-loans': { label: 'Interest on loans', type: 'expense' },
  'loan-setup-cost': { label: 'Loan Set Up Cost', type: 'expense' },
  'lmi': { label: 'LMI (Lender Mortgage Insurance)', type: 'expense' },
  'bank-fees': { label: 'Bank Fees', type: 'expense' },
  'insurance': { label: 'Insurance', type: 'expense' },
  'compliance-testing': { label: 'Compliance & Testing', type: 'expense' },
  'advertising': { label: 'Advertising for Tenant', type: 'expense' },
  'body-corporate': { label: 'Body Corporate Fees', type: 'expense' },
  'borrowing-expenses': { label: 'Borrowing Expenses', type: 'expense' },
  'cleaning': { label: 'Cleaning', type: 'expense' },
  'variable-outgoings-paid': { label: 'Variable Outgoings Paid', type: 'expense' },
  'water-usage': { label: 'Water Usage', type: 'expense' },
  'utility-levy': { label: 'Utility Levy', type: 'expense' },
  'internet': { label: 'Internet', type: 'expense' },

  // ============ COST CATEGORIES ============
  // These are the CGT cost-base heads — separate from the like-named Expense
  // categories above (e.g. LMI, Loan Set Up Cost, Depreciation), since the
  // same cost can be either capitalised into cost base or claimed as an
  // immediate expense depending on how the user treats it.
  'purchase-cost': { label: 'Purchase Cost', type: 'cost' },
  'stamp-duty': { label: 'Stamp Duty', type: 'cost' },
  'conveyancer-fees': { label: 'Conveyancer Fees', type: 'cost' },
  'bank-fees-capitalised': { label: 'Bank Fees Capitalised', type: 'cost' },
  'body-corporate-sinking-fund': { label: 'Body Corporate - Sinking Fund', type: 'cost' },
  'building-pest-inspection': { label: 'Building and Pest Inspection', type: 'cost' },
  'buyer-agent-fees': { label: 'Buyer agent fees', type: 'cost' },
  'capital-improvement': { label: 'Capital Improvement', type: 'cost' },
  'construction-cost': { label: 'Construction Cost', type: 'cost' },
  'conveyancer-purchases': { label: 'Conveyancer Purchases', type: 'cost' },
  'conveyancer-selling': { label: 'Conveyancer Selling', type: 'cost' },
  'council-rates-capitalised': { label: 'Council Rates Capitalised', type: 'cost' },
  'demolition-cost': { label: 'Demolition Cost', type: 'cost' },
  'equipment-cost': { label: 'Equipment Cost', type: 'cost' },
  'expenses-capitalised': { label: 'Expenses capitalised', type: 'cost' },
  'insurance-capitalised': { label: 'Insurance Capitalised', type: 'cost' },
  'interest-capitalised': { label: 'Interest Capitalised', type: 'cost' },
  'land-tax-capitalised': { label: 'Land Tax Capitalised', type: 'cost' },
  'lmi-capitalised': { label: 'LMI (Lender Mortgage Insurance)', type: 'cost' },
  'loan-setup-cost-capitalised': { label: 'Loan Set Up Cost', type: 'cost' },
  'pexa-fees': { label: 'Pexa Fees', type: 'cost' },
  'plans-permit': { label: 'Plans & permit', type: 'cost' },
  'repairs-capitalised': { label: 'Repairs Capitalised', type: 'cost' },
  'selling-agent-advertising-fees': { label: 'Selling agent & advertising fees', type: 'cost' },
  'staging-fees': { label: 'Staging fees', type: 'cost' },
  'sub-division-cost': { label: 'Sub-division Cost', type: 'cost' },
  'title-insurance': { label: 'Title Insurance', type: 'cost' },
  'title-registration': { label: 'Title Registration', type: 'cost' },
  'water-rates-capitalised': { label: 'Water Rates Capitalised', type: 'cost' },
  'depreciation-schedule-capitalised': { label: 'Depreciation (from Schedule)', type: 'cost' },
  'depreciation-manual': { label: 'Depreciation Manual', type: 'cost' },
  'lmi-expenses-recognized': { label: 'LMI expenses recognized as expense', type: 'cost' },
  'loan-setup-costs-expenses-recognized': { label: 'Loan Set up costs expenses recognized as expense', type: 'cost' },
  'dep-div-43': { label: 'Dep-Div 43(Capital Improvements)', type: 'cost' },
  'dep-div-40': { label: 'Dep-Div 40(Equipment Cost)', type: 'cost' },
};

export async function getCategoryLabels(): Promise<Record<string, { label: string; type: 'income' | 'expense' | 'cost' }>> {
  return categoryLabelsMap;
}

export async function getTransactions(): Promise<Transaction[]> {
  const response = await transactionsApi.getAll({ limit: 100 });
  if (response.success && response.data) {
    const data = response.data as { transactions: Array<Record<string, unknown>> };
    return (data.transactions || []).map(t => {
      const categoryName = t.category_name as string || '';
      return {
        id: t.id as string,
        propertyId: t.property_id as string,
        propertyName: t.property_name as string,
        category: categoryName,
        categoryLabel: t.category_display_name as string || categoryLabelsMap[categoryName]?.label || categoryName,
        type: t.type as 'income' | 'expense',
        amount: parseFloat(t.amount as string),
        date: t.date as string,
        description: t.description as string,
        createdAt: t.created_at as string,
      };
    });
  }
  return [];
}

export async function getTransactionsByProperty(propertyId: string): Promise<Transaction[]> {
  const response = await transactionsApi.getAll({ propertyId, limit: 100 });
  if (response.success && response.data) {
    const data = response.data as { transactions: Array<Record<string, unknown>> };
    return (data.transactions || []).map(t => {
      const categoryName = t.category_name as string || '';
      return {
        id: t.id as string,
        propertyId: t.property_id as string,
        propertyName: t.property_name as string,
        category: categoryName,
        categoryLabel: t.category_display_name as string || categoryLabelsMap[categoryName]?.label || categoryName,
        type: t.type as 'income' | 'expense',
        amount: parseFloat(t.amount as string),
        date: t.date as string,
        description: t.description as string,
        createdAt: t.created_at as string,
      };
    });
  }
  return [];
}

// Fetches every transaction in a date range (across all properties) for report
// generation. Uses a high limit since reports need the full period, not a page.
export async function getTransactionsInRange(range: { startDate?: string; endDate?: string; propertyId?: string }): Promise<Transaction[]> {
  const response = await transactionsApi.getAll({ ...range, limit: 5000 });
  if (response.success && response.data) {
    const data = response.data as { transactions: Array<Record<string, unknown>> };
    return (data.transactions || []).map(t => {
      const categoryName = t.category_name as string || '';
      return {
        id: t.id as string,
        propertyId: t.property_id as string,
        propertyName: t.property_name as string,
        category: categoryName,
        categoryLabel: t.category_display_name as string || categoryLabelsMap[categoryName]?.label || categoryName,
        type: t.type as 'income' | 'expense' | 'cost',
        amount: parseFloat(t.amount as string),
        date: t.date as string,
        description: t.description as string,
        createdAt: t.created_at as string,
      };
    });
  }
  return [];
}

export async function addTransaction(data: {
  propertyId: string;
  propertyName?: string;
  propertyType?: string;
  category: string;
  amount: number;
  date: string;
  transactionSource?: string;
  description?: string;
  receiptUrl?: string;
}): Promise<{ success: boolean; error?: string }> {
  const categoryInfo = categoryLabelsMap[data.category] || { label: data.category, type: 'expense' };

  const response = await transactionsApi.create({
    propertyId: data.propertyId,
    description: data.description || categoryInfo.label,
    amount: data.amount,
    date: data.date,
    type: categoryInfo.type,
    categoryName: data.category,
    transactionSource: data.transactionSource || 'Manual Entry',
    status: 'paid',
    ...(data.receiptUrl ? { receiptUrl: data.receiptUrl } : {}),
  });

  if (response.success) {
    return { success: true };
  }

  return { success: false, error: response.error || 'Failed to create transaction' };
}

export async function addMultipleTransactions(items: Array<{
  propertyId: string;
  propertyName?: string;
  propertyType?: string;
  category: string;
  amount: number;
  date: string;
  transactionSource?: string;
  description?: string;
  receiptUrl?: string;
}>): Promise<{ success: boolean; error?: string; count?: number; failures?: string[] }> {
  let count = 0;
  const failures: string[] = [];

  for (const item of items) {
    const result = await addTransaction(item);
    if (result.success) {
      count++;
    } else {
      failures.push(result.error || 'Failed to create transaction');
    }
  }

  return { success: failures.length === 0, count, failures: failures.length ? failures : undefined };
}

export async function removeTransaction(transactionId: string): Promise<{ success: boolean; error?: string }> {
  const response = await transactionsApi.delete(transactionId);

  if (response.success) {
    return { success: true };
  }

  return { success: false, error: response.error || 'Failed to delete transaction' };
}

export async function updateTransaction(
  transactionId: string,
  data: Partial<Transaction>
): Promise<{ success: boolean; error?: string }> {
  const updateData: Record<string, unknown> = {};

  if (data.description) updateData.description = data.description;
  if (data.amount !== undefined) updateData.amount = data.amount;
  if (data.date) updateData.date = data.date;
  if (data.category) {
    const categoryInfo = categoryLabelsMap[data.category] || { label: data.category, type: 'expense' };
    updateData.categoryName = data.category;
    updateData.type = categoryInfo.type;
  }

  const response = await transactionsApi.update(transactionId, updateData);

  if (response.success) {
    return { success: true };
  }

  return { success: false, error: response.error || 'Failed to update transaction' };
}

export async function getDashboardSummary(): Promise<{
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  totalMarketValue: number;
  totalLoan: number;
  netEquity: number;
  recentTransactions: Transaction[];
  propertyCount: number;
}> {
  try {
    // Get transactions stats
    const statsResponse = await transactionsApi.getStats();
    const transactionsResponse = await transactionsApi.getAll({ limit: 5 });
    const propertiesResponse = await propertiesApi.getStats();

    let totalIncome = 0;
    let totalExpenses = 0;
    let totalMarketValue = 0;
    let propertyCount = 0;

    if (statsResponse.success && statsResponse.data) {
      const stats = statsResponse.data as { stats: { income: { total: number }; expense: { total: number } } };
      totalIncome = stats.stats?.income?.total || 0;
      totalExpenses = stats.stats?.expense?.total || 0;
    }

    if (propertiesResponse.success && propertiesResponse.data) {
      const propStats = propertiesResponse.data as { stats: { totalValue: number; totalProperties: number } };
      totalMarketValue = propStats.stats?.totalValue || 0;
      propertyCount = propStats.stats?.totalProperties || 0;
    }

    let recentTransactions: Transaction[] = [];
    if (transactionsResponse.success && transactionsResponse.data) {
      const data = transactionsResponse.data as { transactions: Array<Record<string, unknown>> };
      recentTransactions = (data.transactions || []).map(t => ({
        id: t.id as string,
        propertyId: t.property_id as string,
        propertyName: t.property_name as string,
        category: t.category_name as string || '',
        categoryLabel: t.category_display_name as string,
        type: t.type as 'income' | 'expense',
        amount: parseFloat(t.amount as string),
        date: t.date as string,
        description: t.description as string,
        createdAt: t.created_at as string,
      }));
    }

    return {
      totalIncome,
      totalExpenses,
      netIncome: totalIncome - totalExpenses,
      totalMarketValue,
      totalLoan: 0, // Not tracked in current schema
      netEquity: totalMarketValue,
      recentTransactions,
      propertyCount,
    };
  } catch (error) {
    console.error('Error getting dashboard summary:', error);
    return {
      totalIncome: 0,
      totalExpenses: 0,
      netIncome: 0,
      totalMarketValue: 0,
      totalLoan: 0,
      netEquity: 0,
      recentTransactions: [],
      propertyCount: 0,
    };
  }
}

export async function resetTransactions(): Promise<{ success: boolean }> {
  // No-op for API-based implementation
  return { success: true };
}
