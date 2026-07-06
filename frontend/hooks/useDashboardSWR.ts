'use client';

import useSWR from 'swr';
import { getDashboardSummary } from '@/lib/transaction';

export function useDashboardSWR() {
    const { data, error, isLoading, mutate } = useSWR(
        'dashboard-summary',
        async () => {
            const data = await getDashboardSummary();
            return data;
        },
        {
            revalidateOnMount: true,
            dedupingInterval: 5 * 60 * 1000, // Cache for 5 minutes
            keepPreviousData: true,
        }
    );

    return {
        summary: data,
        isLoading,
        error,
        refresh: mutate,
    };
}
