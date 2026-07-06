'use client';

import { useState, useEffect, useCallback } from 'react';
import { propertiesApi } from '@/lib/api';

export interface Property {
  id: string;
  name: string;
  usage?: string;
  address: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  full_address?: string;
  // Additional address fields for compatibility
  city?: string;
  state?: string;
  postalCode?: string;
  // Property details
  type: string;
  sub_type?: string;
  units: number;
  occupancy: number;
  purchase_price?: number;
  current_value?: number;
  marketValue?: number | string; // For form compatibility
  monthly_rent?: number;
  status: string;
  // Ownership details
  ownership?: string;
  ownershipDetails?: string; // JSON string (camelCase)
  ownership_details?: string; // JSON string (snake_case from DB)
  // Loan details
  loanDetails?: string; // JSON string (camelCase)
  loan_details?: string; // JSON string (snake_case from DB)
  // Depreciation
  hasDepreciation?: boolean;
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface PropertyStats {
  totalProperties: number;
  totalUnits: number;
  totalOccupied: number;
  totalValue: number;
  totalMonthlyRent: number;
}

export function useProperties() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });

  const fetchProperties = useCallback(async (params?: {
    status?: string;
    type?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await propertiesApi.getAll(params);

      if (response.success && response.data) {
        const data = response.data as { properties: Property[]; pagination: typeof pagination };
        setProperties(data.properties || []);
        if (data.pagination) {
          setPagination(data.pagination);
        }
      } else {
        setError(response.error || 'Failed to fetch properties');
      }
    } catch (err) {
      setError('Failed to fetch properties');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  const createProperty = async (data: Partial<Property>) => {
    try {
      const response = await propertiesApi.create(data);
      if (response.success) {
        await fetchProperties();
        return { success: true };
      }
      return { success: false, error: response.error };
    } catch (err) {
      return { success: false, error: 'Failed to create property' };
    }
  };

  const updateProperty = async (id: string, data: Partial<Property>) => {
    try {
      const response = await propertiesApi.update(id, data);
      if (response.success) {
        await fetchProperties();
        return { success: true };
      }
      return { success: false, error: response.error };
    } catch (err) {
      return { success: false, error: 'Failed to update property' };
    }
  };

  const deleteProperty = async (id: string) => {
    try {
      const response = await propertiesApi.delete(id);
      if (response.success) {
        await fetchProperties();
        return { success: true };
      }
      return { success: false, error: response.error };
    } catch (err) {
      return { success: false, error: 'Failed to delete property' };
    }
  };

  const getProperty = async (id: string) => {
    try {
      const response = await propertiesApi.getOne(id);
      if (response.success && response.data) {
        return { success: true, property: (response.data as { property: Property }).property };
      }
      return { success: false, error: response.error };
    } catch (err) {
      return { success: false, error: 'Failed to fetch property' };
    }
  };

  return {
    properties,
    isLoading,
    error,
    pagination,
    fetchProperties,
    createProperty,
    updateProperty,
    deleteProperty,
    getProperty,
  };
}