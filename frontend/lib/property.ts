'use client';

import { propertiesApi } from './api';

import { Property } from '@/hooks/useProperties';

// Re-export the Property type from hooks for backwards compatibility
export type { Property } from '@/hooks/useProperties';

// Legacy function exports that wrap the API client for backwards compatibility
// These are provided for components that haven't been updated to use hooks yet

export async function getProperties(): Promise<Property[]> {
  const response = await propertiesApi.getAll();
  if (response.success && response.data) {
    return ((response.data as { properties: Property[] }).properties || []);
  }
  return [];
}

export async function getProperty(propertyId: string): Promise<Property | null> {
  const response = await propertiesApi.getOne(propertyId);
  if (response.success && response.data) {
    return (response.data as { property: Property }).property;
  }
  return null;
}

export async function addProperty(formData: FormData): Promise<{ success: boolean; error?: string }> {
  // Parse loanDetails and ownershipDetails from JSON strings
  let loanDetails = {};
  let ownershipDetails = {};

  try {
    const loanDetailsStr = formData.get('loanDetails') as string;
    if (loanDetailsStr) {
      loanDetails = JSON.parse(loanDetailsStr);
    }
  } catch { /* ignore parse errors */ }

  try {
    const ownershipDetailsStr = formData.get('ownershipDetails') as string;
    console.log('=== addProperty: ownershipDetailsStr ===', ownershipDetailsStr);
    if (ownershipDetailsStr) {
      ownershipDetails = JSON.parse(ownershipDetailsStr);
      console.log('=== addProperty: parsed ownershipDetails ===', ownershipDetails);
    }
  } catch { /* ignore parse errors */ }

  // Extract just the street portion from the full address
  // The full address comes in as "123, Test Street, Sydney, NSW, 2000"
  // We only want the street part (everything before the suburb)
  const fullAddress = formData.get('address') as string || '';
  const city = formData.get('city') as string || '';
  const state = formData.get('state') as string || '';
  const zipCode = formData.get('postalCode') as string || '';

  console.log('=== CREATING PROPERTY ===');
  console.log('FormData city:', city);
  console.log('FormData state:', state);
  console.log('FormData zipCode:', zipCode);

  // Remove the city, state, and postcode from the address to get just the street
  // Use name as street address if available (cleaner)
  let street = (formData.get('name') as string) || fullAddress;

  if (!formData.get('name') && city && fullAddress.includes(city)) {
    // Find where the city starts and take everything before it
    const cityIndex = fullAddress.indexOf(city);
    if (cityIndex > 0) {
      street = fullAddress.substring(0, cityIndex).replace(/,\s*$/, '').trim();
    }
  }

  // Strip a stray trailing comma so it doesn't get doubled when full_address is built
  street = street.trim().replace(/,\s*$/, '');

  const addressObj = {
    street: street,
    city: city,
    state: state,
    zipCode: zipCode,
  };

  console.log('Address object to save:', addressObj);

  // Get propertyStructure and numberOfUnits
  const propertyStructure = formData.get('propertyStructure') as string || 'single-dwelling';
  const numberOfUnits = parseInt(formData.get('numberOfUnits') as string) || 1;

  const data = {
    name: formData.get('name') as string,
    address: addressObj,
    type: (formData.get('type') as string)?.toLowerCase() || 'residential',
    sub_type: (formData.get('subType') as string) || null,
    units: numberOfUnits,
    currentValue: parseFloat((formData.get('marketValue') as string)?.replace(/[$,]/g, '') || '0'),
    purchasePrice: parseFloat((formData.get('purchasePrice') as string)?.replace(/[$,]/g, '') || '0'),
    purchaseDate: formData.get('purchaseDate') as string || null,
    monthlyRent: parseFloat((formData.get('monthlyRent') as string)?.replace(/[$,]/g, '') || '0'),
    bedrooms: parseInt(formData.get('bedrooms') as string) || 0,
    bathrooms: parseInt(formData.get('bathrooms') as string) || 0,
    squareFeet: parseInt(formData.get('size') as string) || 0,
    notes: formData.get('notes') as string || '',
    // New fields for loan and ownership
    loanDetails,
    ownershipDetails: {
      ...ownershipDetails,
      propertyStructure, // Add propertyStructure to ownershipDetails for storage
    },
    ownership: formData.get('ownership') as string || null,
    hasDepreciation: formData.get('hasDepreciation') === 'yes',
    usage: formData.get('usage') as string || null,
  };

  console.log('=== addProperty: FULL DATA BEING SENT ===', JSON.stringify(data, null, 2));
  console.log('=== ownershipDetails in data ===', data.ownershipDetails);

  const response = await propertiesApi.create(data);

  if (response.success) {
    return { success: true };
  }

  return { success: false, error: response.error || 'Failed to create property' };
}

export async function updateProperty(
  propertyId: string,
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const data: Record<string, unknown> = {};

  const name = formData.get('name');
  if (name) data.name = name;

  const fullAddressUpdate = formData.get('address') as string || '';
  const cityUpdate = formData.get('city') as string || '';
  const stateUpdate = formData.get('state') as string || '';
  const postalCode = formData.get('postalCode') as string || '';

  console.log('=== UPDATING PROPERTY ===');
  console.log('FormData city:', cityUpdate);
  console.log('FormData state:', stateUpdate);
  console.log('FormData zipCode:', postalCode);

  // Always update address if any address field is present
  if (fullAddressUpdate || cityUpdate || stateUpdate || postalCode) {
    // Extract just the street portion from the full address
    // Use the name as the street address (it contains Street No + Street Name)
    // Fallback to parsing full address if name is not available
    let streetUpdate = (formData.get('name') as string) || fullAddressUpdate;

    if (!formData.get('name') && cityUpdate && fullAddressUpdate.includes(cityUpdate)) {
      const cityIndex = fullAddressUpdate.indexOf(cityUpdate);
      if (cityIndex > 0) {
        streetUpdate = fullAddressUpdate.substring(0, cityIndex).replace(/,\s*$/, '').trim();
      }
    }

    // Strip a stray trailing comma so it doesn't get doubled when full_address is built
    streetUpdate = streetUpdate.trim().replace(/,\s*$/, '');

    const addressObj = {
      street: streetUpdate || '',
      city: cityUpdate || '',
      state: stateUpdate || '',
      zipCode: postalCode || '',
    };

    console.log('Address object to update:', addressObj);
    data.address = addressObj;
  }

  const type = formData.get('type');
  if (type) data.type = (type as string).toLowerCase();

  const subType = formData.get('subType');
  if (subType) data.sub_type = subType;

  const marketValue = formData.get('marketValue');
  if (marketValue) data.currentValue = parseFloat((marketValue as string).replace(/[$,]/g, '') || '0');

  const purchasePrice = formData.get('purchasePrice');
  if (purchasePrice) data.purchasePrice = parseFloat((purchasePrice as string).replace(/[$,]/g, '') || '0');

  const purchaseDate = formData.get('purchaseDate');
  if (purchaseDate) data.purchaseDate = purchaseDate;

  const bedrooms = formData.get('bedrooms');
  if (bedrooms) data.bedrooms = parseInt(bedrooms as string);

  const bathrooms = formData.get('bathrooms');
  if (bathrooms) data.bathrooms = parseInt(bathrooms as string);

  const size = formData.get('size');
  if (size) data.squareFeet = parseInt(size as string);

  const notes = formData.get('notes');
  if (notes !== null) data.notes = notes;

  // Handle loan and ownership details
  const loanDetailsStr = formData.get('loanDetails') as string;
  if (loanDetailsStr) {
    try {
      data.loanDetails = JSON.parse(loanDetailsStr);
    } catch { /* ignore */ }
  }

  const ownershipDetailsStr = formData.get('ownershipDetails') as string;
  if (ownershipDetailsStr) {
    try {
      const ownershipDetails = JSON.parse(ownershipDetailsStr);
      // Include propertyStructure in ownership details
      const propertyStructure = formData.get('propertyStructure') as string;
      if (propertyStructure) {
        ownershipDetails.propertyStructure = propertyStructure;
      }
      data.ownershipDetails = ownershipDetails;
    } catch { /* ignore */ }
  }

  // Handle numberOfUnits (stored as units in DB)
  const numberOfUnits = formData.get('numberOfUnits') as string;
  if (numberOfUnits) {
    data.units = parseInt(numberOfUnits) || 1;
  }

  const ownership = formData.get('ownership');
  if (ownership) data.ownership = ownership;

  const hasDepreciation = formData.get('hasDepreciation');
  if (hasDepreciation !== null) {
    data.hasDepreciation = hasDepreciation === 'yes';
  }

  const usage = formData.get('usage') as string;
  if (usage) data.usage = usage;

  const response = await propertiesApi.update(propertyId, data);

  if (response.success) {
    return { success: true };
  }

  return { success: false, error: response.error || 'Failed to update property' };
}


export async function removeProperty(propertyId: string): Promise<{ success: boolean; error?: string }> {
  const response = await propertiesApi.delete(propertyId);

  if (response.success) {
    return { success: true };
  }

  return { success: false, error: response.error || 'Failed to delete property' };
}

export async function resetProperties(): Promise<{ success: boolean }> {
  // No-op for API-based implementation
  return { success: true };
}

export interface LoanBankDetail {
  id?: string;
  bankName?: string;
  bsbNumber?: string;
  loanAccountNumber?: string;
  loanAmount?: number | string;
  loanAllocationPercent?: string;
  document?: { name: string; size: number; url?: string } | null;
  interestType?: string;
  loanType?: string;
  productName?: string;
  startDate?: string;
  endDate?: string;
  interestRate?: string;
  repaymentAmount?: string;
  redrawAmount?: string;
  fixedInterestExpiry?: string;
}

export const BANK_LABELS: Record<string, string> = {
  'commonwealth': 'CBA',
  'westpac': 'WBC',
  'anz': 'ANZ',
  'nab': 'NAB',
  'macquarie': 'MAC',
  'ing': 'ING',
  'other': 'OTH',
};

export function getBankLabel(bankName?: string): string {
  if (!bankName) return '';
  return BANK_LABELS[bankName] || bankName.toUpperCase().substring(0, 3);
}

export interface LoanSummary {
  /** Sum of loanAmount * (loanAllocationPercent / 100) across every bank on the property. */
  totalLoan: number;
  netEquity: number;
  lvr: number;
  banks: LoanBankDetail[];
  primaryBank: LoanBankDetail | null;
}

/**
 * Loan Allocation % is the share of a given loan's balance attributed to this
 * property (relevant when one loan facility funds multiple properties) — not
 * a share of the property's market value. The first bank entry is the primary
 * loan, any others are secondary.
 */
export function getLoanSummary(property: { current_value?: number; marketValue?: number | string; loan_details?: unknown; loanDetails?: unknown }): LoanSummary {
  const marketValue = Number(property.current_value ?? property.marketValue ?? 0) || 0;
  let banks: LoanBankDetail[] = [];

  try {
    const raw = property.loan_details ?? property.loanDetails;
    const loanData = typeof raw === 'string' ? JSON.parse(raw) : raw;

    if (Array.isArray(loanData)) {
      banks = loanData.filter((b: LoanBankDetail) => b && b.bankName && b.bankName.trim() !== '');
    } else if (loanData && typeof loanData === 'object' && (loanData as LoanBankDetail).bankName) {
      banks = [loanData as LoanBankDetail];
    }
  } catch { /* ignore malformed loan_details */ }

  const totalLoan = banks.reduce((sum, b) => {
    const amount = Number(b.loanAmount) || 0;
    const allocation = b.loanAllocationPercent ? parseFloat(b.loanAllocationPercent) : 100;
    return sum + amount * (allocation / 100);
  }, 0);

  const netEquity = marketValue - totalLoan;
  const lvr = marketValue > 0 ? (totalLoan / marketValue) * 100 : 0;

  return { totalLoan, netEquity, lvr, banks, primaryBank: banks[0] || null };
}

export const OWNERSHIP_TYPE_LABELS: Record<string, string> = {
  'individual': 'Individual',
  'joint-spouse': 'Joint - Spouse',
  'joint-other': 'Joint - Other',
  'family-trust': 'Family Trust',
  'trust-partnership': 'Trust - Partnership',
  'smsf': 'SMSF',
  'company': 'Company',
  'unit-trust': 'Unit Trust',
};

interface OwnershipOwner {
  name?: string;
  ownership?: string | number;
}

interface OwnershipDetailsShape {
  type?: string;
  owners?: OwnershipOwner[];
  trustOwners?: { trustName?: string; ownership?: string | number }[];
  familyTrust?: { trustName?: string };
  smsf?: { trustName?: string };
}

export interface OwnershipInfo {
  /** e.g. "Family Trust", "Joint - Spouse" */
  typeLabel: string;
  /** Combined owner/entity name(s) + total ownership %, e.g. "Addi and Shah (100.00%)" */
  ownerLabel: string;
}

function joinNames(names: string[]): string {
  const clean = names.filter(n => n && n.trim());
  if (clean.length === 0) return '';
  if (clean.length === 1) return clean[0];
  return `${clean.slice(0, -1).join(', ')} and ${clean[clean.length - 1]}`;
}

/**
 * Ownership Wise reports need both the ownership TYPE (Individual, Family
 * Trust, ...) and a human-readable owner/entity label with its combined %
 * share — e.g. two joint owners collapse into one "Addi and Shah (100.00%)"
 * row rather than two separate rows, since ownership_details describes a
 * single ownership structure per property.
 */
export function getOwnershipInfo(property: { ownership?: string; ownershipDetails?: unknown; ownership_details?: unknown }): OwnershipInfo {
  const fallbackType = property.ownership || 'Individual';
  let details: OwnershipDetailsShape | null = null;

  try {
    const raw = property.ownershipDetails ?? property.ownership_details;
    details = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) as OwnershipDetailsShape : null;
  } catch { /* ignore malformed ownership_details */ }

  const type = details?.type;
  const typeLabel = (type && OWNERSHIP_TYPE_LABELS[type]) || fallbackType;

  if (!details) {
    return { typeLabel, ownerLabel: '' };
  }

  if (type === 'joint-spouse' || type === 'joint-other') {
    const owners = details.owners || [];
    const total = owners.reduce((sum, o) => sum + (parseFloat(String(o.ownership)) || 0), 0);
    const names = joinNames(owners.map(o => o.name || ''));
    return { typeLabel, ownerLabel: names ? `${names} (${total.toFixed(2)}%)` : '' };
  }

  if (type === 'trust-partnership') {
    const trustOwners = details.trustOwners || [];
    const total = trustOwners.reduce((sum, o) => sum + (parseFloat(String(o.ownership)) || 0), 0);
    const names = joinNames(trustOwners.map(o => o.trustName || ''));
    return { typeLabel, ownerLabel: names ? `${names} (${total.toFixed(2)}%)` : '' };
  }

  if (type === 'family-trust') {
    const name = details.familyTrust?.trustName || '';
    return { typeLabel, ownerLabel: name ? `${name} (100.00%)` : '' };
  }

  if (type === 'smsf') {
    const name = details.smsf?.trustName || '';
    return { typeLabel, ownerLabel: name ? `${name} (100.00%)` : '' };
  }

  // individual, company, unit-trust — single named owner at 100%.
  const owner = details.owners?.[0];
  const ownership = owner?.ownership !== undefined ? parseFloat(String(owner.ownership)) : 100;
  return { typeLabel, ownerLabel: owner?.name ? `${owner.name} (${ownership.toFixed(2)}%)` : '' };
}

/**
 * The unit labels a multi-unit property is split into — "A"/"B" for a duplex,
 * "1".."N" for a block of units or rooming house, [] for a single dwelling.
 * Mirrors the address preview shown on the property form (e.g. "A/41 Swanson
 * St"), so a transaction's unit selector and the Unit Wise report agree on
 * the same set of units without a separate per-unit table.
 */
export function getPropertyUnitLabels(propertyStructure: string, numberOfUnits: number): string[] {
  if (propertyStructure === 'duplex') return ['A', 'B'];
  if (propertyStructure === 'rooming-house' || propertyStructure === 'block-of-units') {
    if (numberOfUnits >= 1 && numberOfUnits <= 20) {
      return Array.from({ length: numberOfUnits }, (_, i) => String(i + 1));
    }
  }
  return [];
}

/** Same as getPropertyUnitLabels, but reads propertyStructure/units off a saved Property record. */
export function getUnitLabelsForProperty(property: { units?: number; ownershipDetails?: unknown; ownership_details?: unknown }): string[] {
  let structure = 'single-dwelling';
  try {
    const raw = property.ownershipDetails ?? property.ownership_details;
    const details = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) as { propertyStructure?: string } : null;
    structure = details?.propertyStructure || structure;
  } catch { /* ignore malformed ownership_details */ }

  return getPropertyUnitLabels(structure, property.units || 0);
}
