'use client';

import { useState, useEffect, useCallback } from 'react';
import { tenantsApi } from '@/lib/api';

export interface Tenant {
  id: string;
  property_id: string;
  property_name?: string;
  name: string;
  email?: string;
  phone?: string;
  unit: string;
  lease_start: string;
  lease_end: string;
  monthly_rent: number;
  security_deposit: number;
  rent_due_day: number;
  status: 'active' | 'inactive' | 'pending' | 'evicted';
  emergency_contact?: {
    name?: string;
    phone?: string;
    relationship?: string;
  };
  move_in_date?: string;
  move_out_date?: string;
  notes?: string;
  leaseStatus?: 'active' | 'expired' | 'upcoming';
  daysUntilLeaseEnd?: number;
  created_at: string;
  updated_at: string;
}

export function useTenants() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });

  const fetchTenants = useCallback(async (params?: {
    status?: string;
    propertyId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await tenantsApi.getAll(params);

      if (response.success && response.data) {
        const data = response.data as { tenants: Tenant[]; pagination: typeof pagination };
        setTenants(data.tenants || []);
        if (data.pagination) {
          setPagination(data.pagination);
        }
      } else {
        setError(response.error || 'Failed to fetch tenants');
      }
    } catch (err) {
      setError('Failed to fetch tenants');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const createTenant = async (data: Partial<Tenant>) => {
    try {
      const response = await tenantsApi.create(data);
      if (response.success) {
        await fetchTenants();
        return { success: true };
      }
      return { success: false, error: response.error };
    } catch (err) {
      return { success: false, error: 'Failed to create tenant' };
    }
  };

  const updateTenant = async (id: string, data: Partial<Tenant>) => {
    try {
      const response = await tenantsApi.update(id, data);
      if (response.success) {
        await fetchTenants();
        return { success: true };
      }
      return { success: false, error: response.error };
    } catch (err) {
      return { success: false, error: 'Failed to update tenant' };
    }
  };

  const deleteTenant = async (id: string) => {
    try {
      const response = await tenantsApi.delete(id);
      if (response.success) {
        await fetchTenants();
        return { success: true };
      }
      return { success: false, error: response.error };
    } catch (err) {
      return { success: false, error: 'Failed to delete tenant' };
    }
  };

  const getTenant = async (id: string) => {
    try {
      const response = await tenantsApi.getOne(id);
      if (response.success && response.data) {
        return { success: true, tenant: (response.data as { tenant: Tenant }).tenant };
      }
      return { success: false, error: response.error };
    } catch (err) {
      return { success: false, error: 'Failed to fetch tenant' };
    }
  };

  return {
    tenants,
    isLoading,
    error,
    pagination,
    fetchTenants,
    createTenant,
    updateTenant,
    deleteTenant,
    getTenant,
  };
}