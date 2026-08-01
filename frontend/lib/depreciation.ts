'use client';

import { depreciationApi } from './api';

export interface DepreciationYear {
  id: string;
  financial_date: string; // YYYY-MM-DD, always the last day of the financial year
  division_40_amount: string;
  division_43_amount: string;
  total_amount: string;
}

export interface DepreciationSchedule {
  id: string;
  property_id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  provider: string | null;
  status: 'pending' | 'parsed' | 'failed';
  error_message: string | null;
  created_at: string;
  years: {
    diminishing_value: DepreciationYear[];
    prime_cost: DepreciationYear[];
  };
}

export async function uploadDepreciationSchedule(
  file: File,
  propertyId: string
): Promise<{ success: boolean; error?: string; schedule?: DepreciationSchedule }> {
  const response = await depreciationApi.upload(file, propertyId);
  if (response.success && response.data) {
    return { success: true, schedule: (response.data as unknown as { schedule: DepreciationSchedule }).schedule };
  }
  return { success: false, error: response.error || 'Failed to upload depreciation schedule' };
}

export async function getDepreciationSchedules(propertyId: string): Promise<DepreciationSchedule[]> {
  const response = await depreciationApi.getAll(propertyId);
  if (response.success && response.data) {
    return (response.data as unknown as { schedules: DepreciationSchedule[] }).schedules || [];
  }
  return [];
}

export async function deleteDepreciationSchedule(id: string): Promise<{ success: boolean; error?: string }> {
  const response = await depreciationApi.delete(id);
  if (response.success) return { success: true };
  return { success: false, error: response.error || 'Failed to delete depreciation schedule' };
}

/** The financial year a date falls in, AU convention (1 Jul – 30 Jun), as its last day — e.g. 2026-03-15 -> "2026-06-30". */
export function currentFinancialYearEndDate(reference: Date = new Date()): string {
  const year = reference.getFullYear();
  const endYear = reference.getMonth() >= 6 ? year + 1 : year; // FY starts July (month index 6)
  return `${endYear}-06-30`;
}

/** The most recent uploaded schedule for a property, or undefined if none. */
export function latestSchedule(schedules: DepreciationSchedule[]): DepreciationSchedule | undefined {
  return schedules.find(s => s.status === 'parsed') || schedules[0];
}

/** That schedule's row for the given financial-year end date and method, or undefined if not present. */
export function yearForDate(
  schedule: DepreciationSchedule | undefined,
  financialDate: string,
  method: 'diminishing_value' | 'prime_cost' = 'diminishing_value'
): DepreciationYear | undefined {
  return schedule?.years[method].find(y => y.financial_date === financialDate);
}
