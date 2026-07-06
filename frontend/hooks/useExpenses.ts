'use client';

import { useState, useEffect, useCallback } from 'react';
import { expensesApi } from '@/lib/api';

export interface Expense {
  id: string;
  property_id: string;
  property_name?: string;
  category_id?: string;
  category_name?: string;
  category_display_name?: string;
  description: string;
  amount: number;
  date: string;
  status: 'pending' | 'paid' | 'cancelled';
  vendor?: {
    name?: string;
    contact?: string;
    email?: string;
  };
  payment_method?: string;
  reference_number?: string;
  paid_date?: string;
  is_recurring: boolean;
  recurring_frequency?: string;
  notes?: string;
  is_tax_deductible: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExpenseStats {
  byStatus: Record<string, { count: number; total: number }>;
  byCategory: Array<{ category: string; count: number; total: number }>;
  total: number;
}

export function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });

  const fetchExpenses = useCallback(async (params?: {
    status?: string;
    propertyId?: string;
    categoryId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await expensesApi.getAll(params);

      if (response.success && response.data) {
        const data = response.data as { expenses: Expense[]; pagination: typeof pagination };
        setExpenses(data.expenses || []);
        if (data.pagination) {
          setPagination(data.pagination);
        }
      } else {
        setError(response.error || 'Failed to fetch expenses');
      }
    } catch (err) {
      setError('Failed to fetch expenses');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const createExpense = async (data: Partial<Expense>) => {
    try {
      const response = await expensesApi.create(data);
      if (response.success) {
        await fetchExpenses();
        return { success: true };
      }
      return { success: false, error: response.error };
    } catch (err) {
      return { success: false, error: 'Failed to create expense' };
    }
  };

  const updateExpense = async (id: string, data: Partial<Expense>) => {
    try {
      const response = await expensesApi.update(id, data);
      if (response.success) {
        await fetchExpenses();
        return { success: true };
      }
      return { success: false, error: response.error };
    } catch (err) {
      return { success: false, error: 'Failed to update expense' };
    }
  };

  const deleteExpense = async (id: string) => {
    try {
      const response = await expensesApi.delete(id);
      if (response.success) {
        await fetchExpenses();
        return { success: true };
      }
      return { success: false, error: response.error };
    } catch (err) {
      return { success: false, error: 'Failed to delete expense' };
    }
  };

  const getStats = async (params?: { propertyId?: string; startDate?: string; endDate?: string }) => {
    try {
      const response = await expensesApi.getStats(params);
      if (response.success && response.data) {
        return { success: true, stats: (response.data as { stats: ExpenseStats }).stats };
      }
      return { success: false, error: response.error };
    } catch (err) {
      return { success: false, error: 'Failed to fetch stats' };
    }
  };

  return {
    expenses,
    isLoading,
    error,
    pagination,
    fetchExpenses,
    createExpense,
    updateExpense,
    deleteExpense,
    getStats,
  };
}