'use client';

import { SWRConfig } from 'swr';
import { ReactNode } from 'react';

interface SWRProviderProps {
    children: ReactNode;
}

export function SWRProvider({ children }: SWRProviderProps) {
    return (
        <SWRConfig
            value={{
                // Cache data for 5 minutes
                dedupingInterval: 5 * 60 * 1000,
                // Revalidate on focus
                revalidateOnFocus: true,
                // Revalidate on reconnect
                revalidateOnReconnect: true,
                // Retry on error with exponential backoff
                errorRetryCount: 3,
                errorRetryInterval: 1000,
                // Don't revalidate if tab is not visible
                revalidateIfStale: false,
                // Keep previous data while revalidating
                keepPreviousData: true,
                // Global fetcher function (uses existing API layer)
                fetcher: async (url: string) => {
                    const response = await fetch(url);
                    if (!response.ok) {
                        throw new Error('API request failed');
                    }
                    return response.json();
                },
            }}
        >
            {children}
        </SWRConfig>
    );
}
