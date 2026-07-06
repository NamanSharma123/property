'use client';

import useSWR from 'swr';
import { propertiesApi } from '@/lib/api';
import { Property } from './useProperties';

export function usePropertiesSWR() {
    const { data, error, isLoading, mutate } = useSWR(
        'properties',
        async () => {
            const response = await propertiesApi.getAll({});
            if (response.success && response.data) {
                const data = response.data as { properties: Property[] };
                return data.properties || [];
            }
            throw new Error(response.error || 'Failed to fetch properties');
        },
        {
            revalidateOnMount: true,
            dedupingInterval: 5 * 60 * 1000, // Cache for 5 minutes
        }
    );

    return {
        properties: data || [],
        isLoading,
        error: error?.message,
        refresh: mutate,
    };
}

export function usePropertySWR(propertyId: string) {
    const { data, error, isLoading, mutate } = useSWR(
        propertyId ? `property-${propertyId}` : null,
        async () => {
            const response = await propertiesApi.getOne(propertyId);
            if (response.success && response.data) {
                const data = response.data as { property: Property };
                return data.property;
            }
            throw new Error(response.error || 'Failed to fetch property');
        }
    );

    return {
        property: data,
        isLoading,
        error: error?.message,
        refresh: mutate,
    };
}
