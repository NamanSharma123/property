'use client';

import { useState, useEffect, useCallback } from 'react';
import { transactionsApi } from '@/lib/api';

export interface Transaction {
  id: string;
  property_id: string;
  property_name?: string;
  tenant_id?: string;
  tenant_name?: string;
  category_id?: string;
  category_name?: string;
  category_display_name?: string;
  description: string;
  amount: number;
  signedAmount?: number;
  date: string;
  type: 'income' | 'expense';
  status: 'pending' | 'paid' | 'cancelled' | 'overdue';
  payment_method?: string;
  reference_number?: string;
  is_recurring: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface TransactionStats {
  income: { total: number; pending: number; paid: number; count: number };
  expense: { total: number; pending: number; paid: number; count: number };
  netIncome: number;
}

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });

  const fetchTransactions = useCallback(async (params?: {
    type?: string;
    status?: string;
    propertyId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await transactionsApi.getAll(params);

      if (response.success && response.data) {
        const data = response.data as { transactions: Transaction[]; pagination: typeof pagination };
        setTransactions(data.transactions || []);
        if (data.pagination) {
          setPagination(data.pagination);
        }
      } else {
        setError(response.error || 'Failed to fetch transactions');
      }
    } catch (err) {
      setError('Failed to fetch transactions');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const createTransaction = async (data: Partial<Transaction>) => {
    try {
      const response = await transactionsApi.create(data);
      if (response.success) {
        await fetchTransactions();
        return { success: true };
      }
      return { success: false, error: response.error };
    } catch (err) {
      return { success: false, error: 'Failed to create transaction' };
    }
  };

  const updateTransaction = async (id: string, data: Partial<Transaction>) => {
    try {
      const response = await transactionsApi.update(id, data);
      if (response.success) {
        await fetchTransactions();
        return { success: true };
      }
      return { success: false, error: response.error };
    } catch (err) {
      return { success: false, error: 'Failed to update transaction' };
    }
  };

  const deleteTransaction = async (id: string) => {
    try {
      const response = await transactionsApi.delete(id);
      if (response.success) {
        await fetchTransactions();
        return { success: true };
      }
      return { success: false, error: response.error };
    } catch (err) {
      return { success: false, error: 'Failed to delete transaction' };
    }
  };

  const getStats = async (params?: { propertyId?: string; startDate?: string; endDate?: string }) => {
    try {
      const response = await transactionsApi.getStats(params);
      if (response.success && response.data) {
        return { success: true, stats: response.data as TransactionStats };
      }
      return { success: false, error: response.error };
    } catch (err) {
      return { success: false, error: 'Failed to fetch stats' };
    }
  };

  return {
    transactions,
    isLoading,
    error,
    pagination,
    fetchTransactions,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    getStats,
  };
}