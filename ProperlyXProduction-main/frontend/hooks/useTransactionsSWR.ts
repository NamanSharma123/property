'use client';

import useSWR from 'swr';
import { transactionsApi } from '@/lib/api';
import { Transaction, categoryLabelsMap } from '@/lib/transaction';

export function useTransactionsSWR(propertyId?: string) {
    const { data, error, isLoading, mutate } = useSWR(
        propertyId ? `transactions-${propertyId}` : 'transactions',
        async () => {
            const response = await transactionsApi.getAll(propertyId ? { propertyId, limit: 100 } : { limit: 100 });
            if (response.success && response.data) {
                const data = response.data as { transactions: any[] };
                return (data.transactions || []).map(t => {
                    // Format property type: capitalize first letter or use sub_type if available
                    const mainType = (t.property_type as string) || '';
                    const subType = (t.property_sub_type as string) || '';
                    let displayPropertyType = mainType.charAt(0).toUpperCase() + mainType.slice(1);
                    if (subType) {
                        displayPropertyType = subType.split('-').map((word: string) =>
                            word.charAt(0).toUpperCase() + word.slice(1)
                        ).join(' ');
                    }

                    const categoryName = t.category_name as string || '';
                    return {
                        id: t.id as string,
                        propertyId: t.property_id as string,
                        propertyName: t.property_name as string,
                        propertyType: displayPropertyType,
                        category: categoryName,
                        categoryLabel: t.category_display_name as string || categoryLabelsMap[categoryName]?.label || categoryName,
                        transactionSource: t.transaction_source as string || 'Manual Entry',
                        type: t.type as 'income' | 'expense',
                        amount: parseFloat(t.amount as string),
                        date: t.date as string,
                        description: t.description as string,
                        createdAt: t.created_at as string,
                    };
                }) as Transaction[];
            }
            throw new Error(response.error || 'Failed to fetch transactions');
        },
        {
            revalidateOnMount: true,
            dedupingInterval: 60 * 1000, // Cache for 1 minute (transactions change more often)
        }
    );

    return {
        transactions: data || [],
        isLoading,
        error: error,
        refresh: mutate,
    };
}
