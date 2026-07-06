import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ========================
// FORMAT UTILITIES
// ========================

/**
 * Format a number as currency (AUD by default)
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  options: {
    currency?: string;
    locale?: string;
    showCents?: boolean;
  } = {}
): string {
  const { currency = 'AUD', locale = 'en-AU', showCents = false } = options;

  // Parse amount if it's a string
  let numericAmount = 0;
  if (typeof amount === 'string') {
    numericAmount = parseFloat(amount.replace(/[$,\s]/g, '')) || 0;
  } else if (typeof amount === 'number') {
    numericAmount = isNaN(amount) ? 0 : amount;
  }

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  }).format(numericAmount);
}

/**
 * Format date with flexible options
 */
export function formatDate(
  date: string | Date | null | undefined,
  options: {
    format?: 'short' | 'medium' | 'long';
    locale?: string;
  } = {}
): string {
  const { format = 'medium', locale = 'en-AU' } = options;

  if (!date) return 'N/A';

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(dateObj.getTime())) return 'Invalid date';

    const formatMap: Record<'short' | 'medium' | 'long', Intl.DateTimeFormatOptions> = {
      short: { day: '2-digit', month: '2-digit', year: '2-digit' },
      medium: { day: '2-digit', month: '2-digit', year: 'numeric' },
      long: { day: 'numeric', month: 'long', year: 'numeric' },
    };
    const formatOptions = formatMap[format];

    return dateObj.toLocaleDateString(locale, formatOptions);
  } catch {
    return 'Invalid date';
  }
}

/**
 * Format a percentage value
 */
export function formatPercentage(
  value: number | string | null | undefined,
  decimals: number = 0
): string {
  const numericValue = typeof value === 'string' ? parseFloat(value) : value;
  if (numericValue === null || numericValue === undefined || isNaN(numericValue)) {
    return '0%';
  }
  return `${numericValue.toFixed(decimals)}%`;
}

// ========================
// PARSE UTILITIES
// ========================

/**
 * Parse a currency string to a number
 */
export function parseCurrency(value: string | number | null | undefined): number {
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  if (!value) return 0;

  const sanitized = value.toString().replace(/[$,\s]/g, '');
  const parsed = parseFloat(sanitized);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Parse a JSON string safely
 */
export function safeJsonParse<T>(
  value: string | null | undefined,
  fallback: T
): T {
  if (!value) return fallback;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

// ========================
// VALIDATION UTILITIES
// ========================

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate Australian BSB format (6 digits)
 */
export function isValidBSB(bsb: string): boolean {
  const sanitized = bsb.replace(/[^0-9]/g, '');
  return sanitized.length === 6;
}

/**
 * Validate Australian postcode format (4 digits)
 */
export function isValidPostcode(postcode: string): boolean {
  const sanitized = postcode.replace(/[^0-9]/g, '');
  return sanitized.length >= 4 && sanitized.length <= 6;
}

/**
 * Validate a positive number (including zero)
 */
export function isPositiveNumber(value: number | string): boolean {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return !isNaN(num) && num >= 0;
}

/**
 * Validate ownership percentages total to 100%
 */
export function validateOwnershipTotal(
  percentages: (number | string)[]
): { valid: boolean; total: number; error?: string } {
  const total = percentages.reduce((sum: number, p) => {
    const num = typeof p === 'string' ? parseFloat(p) : p;
    return sum + (isNaN(num) ? 0 : num);
  }, 0);

  if (Math.abs(total - 100) > 0.01) {
    return {
      valid: false,
      total,
      error: `Ownership percentages must equal 100% (currently ${total.toFixed(1)}%)`,
    };
  }

  return { valid: true, total };
}

/**
 * Validate date range (from <= to)
 */
export function validateDateRange(
  fromDate: string | Date,
  toDate: string | Date
): { valid: boolean; error?: string } {
  const from = new Date(fromDate);
  const to = new Date(toDate);

  if (isNaN(from.getTime())) {
    return { valid: false, error: 'Invalid from date' };
  }
  if (isNaN(to.getTime())) {
    return { valid: false, error: 'Invalid to date' };
  }
  if (from > to) {
    return { valid: false, error: 'From date must be before or equal to To date' };
  }

  return { valid: true };
}

// ========================
// SANITIZE UTILITIES
// ========================

/**
 * Sanitize currency input (keep only numbers and one decimal)
 */
export function sanitizeCurrencyInput(value: string): string {
  return value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
}

/**
 * Sanitize numeric input (keep only numbers)
 */
export function sanitizeNumericInput(value: string): string {
  return value.replace(/[^0-9]/g, '');
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

// ========================
// CALCULATION UTILITIES
// ========================

/**
 * Generate random ID
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

/**
 * Calculate occupancy rate
 */
export function calculateOccupancy(occupiedUnits: number, totalUnits: number): number {
  if (totalUnits === 0) return 0;
  return Math.round((occupiedUnits / totalUnits) * 100);
}

/**
 * Calculate cash flow
 */
export function calculateCashFlow(income: number, expenses: number): number {
  return income - expenses;
}

// ========================
// DEBOUNCE UTILITY
// ========================

/**
 * Debounce function to prevent rapid repeated calls
 */
export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  waitMs: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func(...args);
    }, waitMs);
  };
}