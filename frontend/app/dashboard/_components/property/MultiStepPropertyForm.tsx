'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  X,
  Loader2,
  Check,
  Plus,
  Trash2,
  Upload,
  MapPin,
  HelpCircle
} from 'lucide-react';
import { addProperty, updateProperty, getProperties, type Property } from '@/lib/property';
import { documentsApi } from '@/lib/api';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useUnsavedChangesWarning } from '@/hooks/useFormPersistence';

interface MultiStepPropertyFormProps {
  onClose: () => void;
  onSuccess?: () => void;
  property?: Property; // If provided, form is in edit mode
}

interface Owner {
  id: string;
  name: string;
  ownership: string;
}

interface TrustOwner {
  id: string;
  trustName: string;
  companyTrustee: string;
  ownership: string;
}

interface LoanAllocation {
  id: string;
  allocationPercent: string;
  fromDate: string;
  toDate: string;
}

interface BankDetails {
  id: string;
  bankName: string;
  bsbNumber: string;
  loanAccountNumber: string;
  loanAmount: string;
  loanAllocationPercent: string;
  allocateByDateRange: boolean;
  allocations: LoanAllocation[];
  document?: { name: string; size: number; url?: string } | null;
}

const STATES = [
  { value: 'NSW', label: 'New South Wales' },
  { value: 'VIC', label: 'Victoria' },
  { value: 'QLD', label: 'Queensland' },
  { value: 'WA', label: 'Western Australia' },
  { value: 'SA', label: 'South Australia' },
  { value: 'TAS', label: 'Tasmania' },
  { value: 'ACT', label: 'Australian Capital Territory' },
  { value: 'NT', label: 'Northern Territory' },
];

const PROPERTY_TYPES = [
  { value: 'residential-investment', label: 'Residential - Investment', type: 'Residential', usage: 'Investment' },
  { value: 'residential-owner-occupied', label: 'Residential - Owner Occupied', type: 'Residential', usage: 'Owner Occupied' },
  { value: 'commercial-investment', label: 'Commercial - Investment', type: 'Commercial', usage: 'Investment' },
];

// Address suggestions for future autocomplete feature
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _MOCK_ADDRESSES = [
  { street: '123 Fake St', city: 'Sydney', state: 'NSW', zip: '2000', full: '123 Fake St, Sydney NSW 2000' },
  { street: '42 Wallaby Way', city: 'Sydney', state: 'NSW', zip: '2000', full: '42 Wallaby Way, Sydney NSW 2000' },
  { street: '10 Downing St', city: 'London', state: 'NSW', zip: '2000', full: '10 Downing St, London NSW 2000' },
];

const PROPERTY_STRUCTURES = [
  { value: 'single-dwelling', label: 'Single Dwelling' },
  { value: 'duplex', label: 'Duplex' },
  { value: 'rooming-house', label: 'Rooming House' },
  { value: 'block-of-units', label: 'Block of Units' },
];

const OWNERSHIP_TYPES = [
  { value: 'individual', label: 'Individual' },
  { value: 'joint-spouse', label: 'Joint - Spouse' },
  { value: 'joint-other', label: 'Joint - Other' },
  { value: 'family-trust', label: 'Family Trust' },
  { value: 'trust-partnership', label: 'Trust - Partnership' },
  { value: 'smsf', label: 'SMSF' },
  { value: 'company', label: 'Company' },
  { value: 'unit-trust', label: 'Unit Trust' },
];

// Company and Unit Trust are a single legal-entity owner, same shape as
// Individual (one name, 100% ownership) — just a different label on the input.
const SINGLE_OWNER_TYPES = ['individual', 'company', 'unit-trust'];

const BANKS = [
  { value: 'commonwealth', label: 'Commonwealth Bank' },
  { value: 'westpac', label: 'Westpac' },
  { value: 'anz', label: 'ANZ' },
  { value: 'nab', label: 'NAB' },
  { value: 'macquarie', label: 'Macquarie Bank' },
  { value: 'ing', label: 'ING' },
  { value: 'other', label: 'Other' },
];



export function MultiStepPropertyForm({ onClose, onSuccess, property }: MultiStepPropertyFormProps) {
  const isEditMode = !!property;
  // If form is open, we have potential unsaved changes unless it's just opened and empty (simplification)
  // We disable the warning when submitting
  const [isSubmitting, setIsSubmitting] = useState(false);
  useUnsavedChangesWarning(!isSubmitting);

  const [step, setStep] = useState(1);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [uploadingDocFor, setUploadingDocFor] = useState<Record<string, boolean>>({});

  const openDocument = async (storedUrl: string) => {
    const result = await documentsApi.getViewUrl(storedUrl);
    if (result.success && result.data?.url) {
      window.open(result.data.url, '_blank', 'noopener,noreferrer');
    } else {
      alert(result.error || 'Could not open document. Please try again.');
    }
  };

  // Step 1: Property Details
  const [locationMode, setLocationMode] = useState<'choose' | 'manual'>('manual');
  const [location, setLocation] = useState('');
  const [streetNo, setStreetNo] = useState('');
  const [streetName, setStreetName] = useState('');
  const [suburb, setSuburb] = useState('');
  const [state, setState] = useState('');
  const [postCode, setPostCode] = useState('');
  const [marketValue, setMarketValue] = useState('');
  const [propertyType, setPropertyType] = useState('residential-investment');
  // Address search state - reserved for future autocomplete feature
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_addressSearch, _setAddressSearch] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_showAddressSuggestions, _setShowAddressSuggestions] = useState(false);
  const [hasDepreciation, setHasDepreciation] = useState<boolean>(false);
  const [propertyStructure, setPropertyStructure] = useState('single-dwelling');
  const [numberOfUnits, setNumberOfUnits] = useState('');
  const [hasExistingOwnerOccupied, setHasExistingOwnerOccupied] = useState(false);

  // Step 2: Ownership Details
  const [ownershipType, setOwnershipType] = useState('');
  const [owners, setOwners] = useState<Owner[]>([
    { id: '1', name: '', ownership: '100' }
  ]);
  const [trustOwners, setTrustOwners] = useState<TrustOwner[]>([
    { id: '1', trustName: '', companyTrustee: '', ownership: '50' },
    { id: '2', trustName: '', companyTrustee: '', ownership: '50' }
  ]);
  // Family Trust
  const [familyTrustName, setFamilyTrustName] = useState('');
  const [familyCompanyTrustee, setFamilyCompanyTrustee] = useState('');
  // SMSF specific
  const [smsfTrustName, setSmsfTrustName] = useState('');
  const [smsfCompanyTrustee, setSmsfCompanyTrustee] = useState('');
  const [smsfBareTrust, setSmsfBareTrust] = useState('');
  const [smsfBareTrustee, setSmsfBareTrustee] = useState('');

  // Step 3: Loan Details
  const [banks, setBanks] = useState<BankDetails[]>([
    {
      id: '1',
      bankName: '',
      bsbNumber: '',
      loanAccountNumber: '',
      loanAmount: '',
      loanAllocationPercent: '',
      allocateByDateRange: false,
      allocations: [],
      document: null,
    }
  ]);

  // File input refs for document upload (one per bank)
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Initialize form data when editing an existing property
  useEffect(() => {
    if (property) {
      console.log('=== PROPERTY DATA FOR EDIT ===');
      console.log('FULL PROPERTY OBJECT:', property);
      console.log('property.ownership_details:', property.ownership_details);
      console.log('property.ownershipDetails:', property.ownershipDetails);
      console.log('property.address:', property.address);
      console.log('property.name:', property.name);
      console.log('property.full_address:', property.full_address);

      // Parse the address object from the database
      let addressObj: { street?: string; city?: string; state?: string; zipCode?: string } = {};

      try {
        if (typeof property.address === 'string') {
          addressObj = JSON.parse(property.address);
        } else if (property.address && typeof property.address === 'object') {
          addressObj = property.address;
        }
      } catch (err) {
        console.error('Error parsing address:', err);
        addressObj = {};
      }

      console.log('Parsed addressObj:', addressObj);

      // Extract street number and name from the property name or address.street
      const streetAddress = addressObj.street || property.name || '';
      const addressParts = streetAddress.split(' ');
      const streetNoFromName = addressParts[0] || '';
      const streetNameFromName = addressParts.slice(1).join(' ') || '';

      setLocationMode('manual');
      setStreetNo(streetNoFromName);
      setStreetName(streetNameFromName);

      // Extract from address JSONB field
      const suburb = addressObj.city || '';
      const state = addressObj.state || '';
      const postCode = addressObj.zipCode || '';

      console.log('Setting form values:', { suburb, state, postCode });

      setSuburb(suburb);
      setState(state);
      setPostCode(postCode);

      setMarketValue(property.marketValue?.toString().replace(/[$,]/g, '') || property.current_value?.toString() || '');
      setHasDepreciation(property.hasDepreciation || false);

      // Set property type from stored type and usage
      const storedType = (property.type || '').toLowerCase();
      const storedUsage = (property.usage || property.sub_type || '').toLowerCase();

      // Match to combined property type
      if (storedType.includes('commercial')) {
        setPropertyType('commercial-investment');
      } else if (storedUsage.includes('owner')) {
        setPropertyType('residential-owner-occupied');
      } else {
        setPropertyType('residential-investment');
      }

      // Set ownership type
      const ownershipMapping: Record<string, string> = {
        'Individual': 'individual',
        'Joint - Spouse': 'joint-spouse',
        'Joint - Other': 'joint-other',
        'Family Trust': 'family-trust',
        'Trust - Partnership': 'trust-partnership',
        'SMSF': 'smsf',
        'Company': 'company',
        'Unit Trust': 'unit-trust',
      };
      // Store in local variable since setState is async and won't be available yet
      const currentOwnershipType = ownershipMapping[property.ownership || 'Individual'] || 'individual';
      setOwnershipType(currentOwnershipType);

      // Parse ownership details if available
      console.log('=== OWNERSHIP DETAILS DEBUG ===');
      console.log('property.ownershipDetails:', property.ownershipDetails);
      console.log('property.ownership_details:', property.ownership_details);
      console.log('currentOwnershipType:', currentOwnershipType);

      if (property.ownershipDetails || property.ownership_details) {
        try {
          const ownershipDetailsStr = property.ownershipDetails || property.ownership_details;
          console.log('ownershipDetailsStr:', ownershipDetailsStr);
          console.log('typeof ownershipDetailsStr:', typeof ownershipDetailsStr);

          const ownershipData = typeof ownershipDetailsStr === 'string'
            ? JSON.parse(ownershipDetailsStr)
            : ownershipDetailsStr;

          console.log('Parsed ownershipData:', ownershipData);
          console.log('ownershipData.owners:', ownershipData.owners);

          // Load Individual/Joint owners - use currentOwnershipType (local var) not ownershipType (state)
          if (ownershipData.owners && Array.isArray(ownershipData.owners) && ownershipData.owners.length > 0) {
            console.log('Setting owners from data:', ownershipData.owners);
            setOwners(ownershipData.owners.map((o: { name?: string; ownership?: string; id?: string }, idx: number) => ({
              id: currentOwnershipType === 'individual' && idx === 0 ? '1' : (o.id || (idx + 1).toString()),
              name: o.name || '',
              ownership: o.ownership?.toString() || (currentOwnershipType === 'individual' ? '100' : '50')
            })));
          } else if (ownershipData.owners && Array.isArray(ownershipData.owners)) {
            // Handle empty array case for individual
            if (currentOwnershipType === 'individual') {
              setOwners([{ id: '1', name: '', ownership: '100' }]);
            } else {
              setOwners([]);
            }
          }

          // Fallback for individual mode if owners is missing but top-level structure has it (legacy or mismatch)
          if (currentOwnershipType === 'individual' && (!ownershipData.owners || ownershipData.owners.length === 0)) {
            if (ownershipData.ownerName || ownershipData.name) {
              setOwners([{ id: '1', name: ownershipData.ownerName || ownershipData.name || '', ownership: '100' }]);
            }
          }

          // Load Trust Partnership owners
          if (ownershipData.trustOwners && Array.isArray(ownershipData.trustOwners)) {
            setTrustOwners(ownershipData.trustOwners.map((t: { trustName?: string; companyTrustee?: string; ownership?: string }, idx: number) => ({
              id: (idx + 1).toString(),
              trustName: t.trustName || '',
              companyTrustee: t.companyTrustee || '',
              ownership: t.ownership?.toString() || '50'
            })));
          }

          // Load Family Trust details
          if (ownershipData.familyTrust) {
            setFamilyTrustName(ownershipData.familyTrust.trustName || '');
            setFamilyCompanyTrustee(ownershipData.familyTrust.companyTrustee || '');
          } else if (ownershipData.trustName) {
            // Backward compatibility
            setFamilyTrustName(ownershipData.trustName);
            setFamilyCompanyTrustee(ownershipData.companyTrustee || ownershipData.trusteeType || '');
          }

          // Load SMSF details
          if (ownershipData.smsf) {
            setSmsfTrustName(ownershipData.smsf.trustName || '');
            setSmsfCompanyTrustee(ownershipData.smsf.companyTrustee || '');
            setSmsfBareTrust(ownershipData.smsf.bareTrust || '');
            setSmsfBareTrustee(ownershipData.smsf.bareTrustee || '');
          }
        } catch (err) {
          console.error('Error parsing ownership details:', err);
        }
      }

      // Parse loan details if available
      if (property.loanDetails || property.loan_details) {
        try {
          const loanDetailsStr = property.loanDetails || property.loan_details;
          const loanData = typeof loanDetailsStr === 'string'
            ? JSON.parse(loanDetailsStr)
            : loanDetailsStr;

          if (Array.isArray(loanData)) {
            setBanks(loanData.map((loan: { bankName?: string; bsbNumber?: string; bsb?: string; loanAccountNumber?: string; accountNumber?: string; loanAmount?: number | string; loanAllocationPercent?: string; allocateByDateRange?: boolean; allocations?: LoanAllocation[]; document?: { name: string; size: number; url?: string } | null }, idx: number) => ({
              id: (idx + 1).toString(),
              bankName: loan.bankName || '',
              bsbNumber: loan.bsbNumber || loan.bsb || '',
              loanAccountNumber: loan.loanAccountNumber || loan.accountNumber || '',
              loanAmount: loan.loanAmount !== undefined && loan.loanAmount !== null ? String(loan.loanAmount) : '',
              loanAllocationPercent: loan.loanAllocationPercent || '',
              allocateByDateRange: loan.allocateByDateRange || false,
              allocations: loan.allocations || [],
              document: loan.document || null,
            })));
          } else if (loanData.bankName) {
            setBanks([{
              id: '1',
              bankName: loanData.bankName || '',
              bsbNumber: loanData.bsb || '',
              loanAccountNumber: loanData.accountNumber || '',
              loanAmount: '',
              loanAllocationPercent: '',
              allocateByDateRange: false,
              allocations: [],
              document: null,
            }]);
          }
        } catch (err) {
          console.error('Error parsing loan details:', err);
        }
      }
    }
  }, [property]);


  // Check for existing owner-occupied property
  useEffect(() => {
    const checkOwnerOccupied = async () => {
      try {
        const props = await getProperties();
        const exists = props.some(p => {
          // Skip current property if editing
          if (property && p.id === property.id) return false;

          const pUsage = (p.usage || p.sub_type || '').toLowerCase();
          return pUsage.includes('owner');
        });
        setHasExistingOwnerOccupied(exists);
      } catch (e) {
        console.error('Failed to check existing properties', e);
      }
    };
    checkOwnerOccupied();
  }, [property]);

  // Track if we just loaded data from property (to skip the reset)
  const isLoadingFromProperty = useRef(false);

  // Reset ownership data when type changes - but NOT when loading from property
  useEffect(() => {
    // Skip reset if we're loading from an existing property
    if (isLoadingFromProperty.current) {
      isLoadingFromProperty.current = false;
      return;
    }

    // Only reset for NEW properties, not edits
    if (property) {
      return; // Don't reset for edit mode
    }

    if (SINGLE_OWNER_TYPES.includes(ownershipType)) {
      setOwners([{ id: '1', name: '', ownership: '100' }]);
    } else if (ownershipType === 'joint-spouse') {
      setOwners([
        { id: '1', name: '', ownership: '50' },
        { id: '2', name: '', ownership: '50' }
      ]);
    } else if (ownershipType === 'joint-other') {
      setOwners([
        { id: '1', name: '', ownership: '50' },
        { id: '2', name: '', ownership: '50' }
      ]);
    } else if (ownershipType === 'trust-partnership') {
      setTrustOwners([
        { id: '1', trustName: '', companyTrustee: '', ownership: '50' },
        { id: '2', trustName: '', companyTrustee: '', ownership: '50' }
      ]);
    }
  }, [ownershipType, property]);

  // ===== VALIDATION UTILITIES =====

  // Helper to validate percentage value
  const isValidPercentage = (value: string): boolean => {
    const num = parseFloat(value);
    return !isNaN(num) && num >= 0 && num <= 100;
  };

  // Helper to validate account number
  const isValidAccountNumber = (value: string): boolean => {
    const sanitized = value.replace(/[^0-9]/g, '');
    return sanitized.length >= 4 && sanitized.length <= 20;
  };

  // Validate BSB number format (6 digits)
  const validateBSB = (bsb: string): boolean => {
    const sanitized = bsb.replace(/[^0-9]/g, '');
    return sanitized.length === 6;
  };

  // Validate postcode (4-6 digits)
  const validatePostcode = (code: string): boolean => {
    return /^\d{4,6}$/.test(code);
  };

  // Sanitize and format currency input (removes non-numeric chars except decimal)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _sanitizeCurrencyInput = (value: string): string => {
    return value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
  };

  // Parse currency string to number
  const parseCurrency = (value: string): number => {
    const sanitized = value.replace(/[$,\s]/g, '');
    const parsed = parseFloat(sanitized);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Field Validators
  const getStreetNoError = (val: string) => {
    if (!val.trim()) return 'Street number is required';
    // Must contain allowed chars AND at least one digit
    if (!/^[0-9a-zA-Z\-\/\s,.]+$/.test(val.trim())) return 'Invalid format';
    if (!/\d/.test(val)) return 'Must contain a number';
    return undefined;
  };

  const getStreetNameError = (val: string) => {
    if (!val.trim()) return 'Street name is required';
    if (val.trim().length < 2) return 'Must be at least 2 characters';
    if (!/[a-zA-Z]/.test(val)) return 'Must contain letters';
    return undefined;
  };

  const getSuburbError = (val: string) => {
    if (!val.trim()) return 'Suburb is required';
    if (val.trim().length < 2) return 'Must be at least 2 characters';
    if (!/[a-zA-Z]/.test(val)) return 'Must contain letters';
    return undefined;
  };

  const getStateError = (val: string) => !val ? 'State is required' : undefined;

  const getPostCodeError = (val: string) => {
    if (!val.trim()) return 'Post code is required';
    if (!validatePostcode(val)) return 'Must be 4-6 digits';
    return undefined;
  };

  const getMarketValueError = (val: string) => {
    if (!val.trim()) return 'Market value is required';
    const amount = parseCurrency(val);
    if (amount < 0) return 'Cannot be negative';
    if (amount > 999999999) return 'Exceeds maximum';
    return undefined;
  };

  const getPropertyTypeError = (val: string) => !val ? 'Property Type is required' : undefined;

  // Step 2 Validators
  const getOwnershipTypeError = (val: string) => !val ? 'Please select an ownership type' : undefined;

  const getNameError = (val: string, label: string = 'Name') => {
    if (!val.trim()) return `${label} is required`;
    if (val.trim().length < 2) return 'Must be at least 2 characters';
    return undefined;
  };

  const getOwnershipPercentError = (val: string) => {
    if (!val.trim()) return 'Required';
    if (!isValidPercentage(val)) return 'Invalid percentage (0-100)';
    return undefined;
  };

  const getFamilyTrustNameError = (val: string) => getNameError(val, 'Family trust name');
  const getFamilyTrusteeError = (val: string) => getNameError(val, 'Family company trustee');

  const getSMSFTrustNameError = (val: string) => getNameError(val, 'SMSF trust name');
  const getSMSFTrusteeError = (val: string) => getNameError(val, 'SMSF company trustee');
  const getSMSFBareTrustError = (val: string) => getNameError(val, 'SMSF bare trust');
  const getSMSFBareTrusteeError = (val: string) => getNameError(val, 'SMSF bare trustee');

  // Step 3 Validators
  const getBankNameError = (val: string) => !val.trim() ? 'Bank name is required' : undefined;

  const getBSBError = (val: string) => {
    if (!val.trim()) return 'BSB is required';
    if (!validateBSB(val)) return 'Must be 6 digits';
    return undefined;
  };

  const getLoanAccountError = (val: string) => {
    if (!val.trim()) return 'Account number is required';
    if (!isValidAccountNumber(val)) return 'Must be 4-20 digits';
    return undefined;
  };

  const getLoanAmountError = (val: string) => {
    if (!val.trim()) return 'Loan amount is required';
    const amount = parseCurrency(val);
    if (isNaN(amount) || amount <= 0) return 'Must be a positive amount';
    if (amount > 999999999) return 'Exceeds maximum';
    return undefined;
  };

  // Generate address preview
  const getAddressPreview = () => {
    if (propertyStructure === 'single-dwelling') return [];

    const count = parseInt(numberOfUnits) || 0;
    const street = `${streetNo} ${streetName}`.trim();
    if (!street) return [];

    const addresses: string[] = [];
    if (propertyStructure === 'duplex') {
      addresses.push(`A/${street}`, `B/${street}`);
    } else if (propertyStructure === 'rooming-house' || propertyStructure === 'block-of-units') {
      // Only generate preview if count is within valid range (1-20)
      if (count >= 1 && count <= 20) {
        for (let i = 1; i <= count; i++) addresses.push(`${i}/${street}`);
      }
    }
    return addresses;
  };

  // Full step 1 validation
  const validateStep1 = (): { valid: boolean; errors: Record<string, string> } => {
    const errors: Record<string, string> = {};

    // Validate Property Structure Inputs
    const showStructure = propertyType && propertyType !== 'residential-owner-occupied';

    if (showStructure && propertyStructure === 'block-of-units') {
      const n = parseInt(numberOfUnits);
      if (isNaN(n)) errors.numberOfUnits = 'Number of units is required';
      else if (n < 2) errors.numberOfUnits = 'Number of units must be at least 2';
      else if (n > 20) errors.numberOfUnits = 'Number of units cannot exceed 20';
    } else if (showStructure && propertyStructure === 'rooming-house') {
      const n = parseInt(numberOfUnits);
      if (!numberOfUnits.trim()) errors.numberOfUnits = 'Number of rooms is required';
      else if (isNaN(n)) errors.numberOfUnits = 'Invalid number of rooms';
      else if (n < 1) errors.numberOfUnits = 'Number of rooms must be at least 1';
      else if (n > 20) errors.numberOfUnits = 'Number of rooms cannot exceed 20';
    }

    if (locationMode === 'manual') {
      const snErr = getStreetNoError(streetNo); if (snErr) errors.streetNo = snErr;
      const stErr = getStreetNameError(streetName); if (stErr) errors.streetName = stErr;
      const subErr = getSuburbError(suburb); if (subErr) errors.suburb = subErr;
      const stateErr = getStateError(state); if (stateErr) errors.state = stateErr;
      const pcErr = getPostCodeError(postCode); if (pcErr) errors.postCode = pcErr;
    } else if (!location) {
      // errors.push('Please select an address'); // Handled generically?
    }

    const mvErr = getMarketValueError(marketValue); if (mvErr) errors.marketValue = mvErr;
    const ptErr = getPropertyTypeError(propertyType); if (ptErr) errors.propertyType = ptErr;

    return { valid: Object.keys(errors).length === 0, errors };
  };

  // Full step 2 validation
  const validateStep2 = (): { valid: boolean; errors: Record<string, string> } => {
    const errors: Record<string, string> = {};

    const otErr = getOwnershipTypeError(ownershipType);
    if (otErr) errors.ownershipType = otErr;

    if (SINGLE_OWNER_TYPES.includes(ownershipType)) {
      const nameErr = getNameError(owners[0]?.name || '', ownershipType === 'individual' ? 'Owner name' : 'Name');
      if (nameErr) errors.ownerName = nameErr;
    } else if (ownershipType === 'joint-spouse' || ownershipType === 'joint-other') {
      owners.forEach((owner, index) => {
        const i = index + 1;
        const nameErr = getNameError(owner.name, `Owner ${i} name`);
        if (nameErr) errors[`owner${i}Name`] = nameErr;

        const ownErr = getOwnershipPercentError(owner.ownership);
        if (ownErr) errors[`owner${i}Ownership`] = ownErr;
      });

      const total = owners.reduce((sum, o) => sum + (parseFloat(o.ownership) || 0), 0);
      if (Math.abs(total - 100) > 0.01) {
        errors.ownershipTotal = `Total ownership must be 100% (currently ${total.toFixed(1)}%)`;
      }
    } else if (ownershipType === 'family-trust') {
      const tnErr = getFamilyTrustNameError(familyTrustName); if (tnErr) errors.familyTrustName = tnErr;
      const ttErr = getFamilyTrusteeError(familyCompanyTrustee); if (ttErr) errors.familyCompanyTrustee = ttErr;
    } else if (ownershipType === 'trust-partnership') {
      trustOwners.forEach((owner, index) => {
        const tnErr = getNameError(owner.trustName, `Trust ${index + 1} name`);
        if (tnErr) errors[`trust${index + 1}Name`] = tnErr;

        const ttErr = getNameError(owner.companyTrustee, `Trust ${index + 1} trustee`);
        if (ttErr) errors[`trust${index + 1}Trustee`] = ttErr;

        const ownErr = getOwnershipPercentError(owner.ownership);
        if (ownErr) errors[`trust${index + 1}Ownership`] = ownErr;
      });

      const total = trustOwners.reduce((sum, o) => sum + (parseFloat(o.ownership) || 0), 0);
      if (Math.abs(total - 100) > 0.01) {
        errors.ownershipTotal = `Total ownership must be 100% (currently ${total.toFixed(1)}%)`;
      }
    } else if (ownershipType === 'smsf') {
      const tnErr = getSMSFTrustNameError(smsfTrustName); if (tnErr) errors.smsfTrustName = tnErr;
      const ttErr = getSMSFTrusteeError(smsfCompanyTrustee); if (ttErr) errors.smsfCompanyTrustee = ttErr;
      const btErr = getSMSFBareTrustError(smsfBareTrust); if (btErr) errors.smsfBareTrust = btErr;
      const bttErr = getSMSFBareTrusteeError(smsfBareTrustee); if (bttErr) errors.smsfBareTrustee = bttErr;
    }

    return { valid: Object.keys(errors).length === 0, errors };
  };

  // Full step 3 validation
  const validateStep3 = (): { valid: boolean; errors: Record<string, string> } => {
    const errors: Record<string, string> = {};

    const accountSet = new Set<string>();

    banks.forEach((bank, index) => {
      // Check if ANY field has content
      const hasAnyData = bank.bankName || bank.bsbNumber || bank.loanAccountNumber || bank.loanAmount || bank.loanAllocationPercent;

      if (hasAnyData) {
        const bnErr = getBankNameError(bank.bankName);
        if (bnErr) errors[`bank${index + 1}Name`] = bnErr;

        const bsbErr = getBSBError(bank.bsbNumber);
        if (bsbErr) errors[`bank${index + 1}BSB`] = bsbErr;

        const accErr = getLoanAccountError(bank.loanAccountNumber);
        if (accErr) errors[`bank${index + 1}Account`] = accErr;

        const laErr = getLoanAmountError(bank.loanAmount);
        if (laErr) errors[`bank${index + 1}LoanAmount`] = laErr;

        const allocErr = getOwnershipPercentError(bank.loanAllocationPercent);
        if (allocErr) errors[`bank${index + 1}Allocation`] = allocErr;

        // Check duplicates
        const sanitizedBSB = bank.bsbNumber.replace(/[^0-9]/g, '');
        if (validateBSB(bank.bsbNumber) && bank.loanAccountNumber.trim()) {
          const combinedKey = `${sanitizedBSB}-${bank.loanAccountNumber}`;
          if (accountSet.has(combinedKey)) {
            errors[`bank${index + 1}BSB`] = 'Duplicate account combination';
          }
          accountSet.add(combinedKey);
        }
      }
    });

    const totalAllocation = banks.reduce((sum, b) => {
      const percent = parseFloat(b.loanAllocationPercent) || 0;
      return sum + percent;
    }, 0);

    if (totalAllocation > 100) {
      errors.loanAllocation = `Total exceeds 100% (${totalAllocation.toFixed(1)}%)`;
    }

    return { valid: Object.keys(errors).length === 0, errors };
  };

  // Maximum number of owners allowed
  const MAX_OWNERS = 5;
  const MAX_TRUST_OWNERS = 10;
  const MAX_BANKS = 5;

  const addOwner = () => {
    if (owners.length >= MAX_OWNERS) {
      setError(`Maximum of ${MAX_OWNERS} owners allowed`);
      return;
    }
    const remaining = 100 - owners.reduce((sum, o) => sum + parseInt(o.ownership || '0'), 0);
    setOwners([...owners, { id: Date.now().toString(), name: '', ownership: remaining > 0 ? remaining.toString() : '' }]);
  };

  const removeOwner = (id: string) => {
    if (owners.length > 2) {
      setOwners(owners.filter(o => o.id !== id));
    }
  };

  const updateOwner = (id: string, field: keyof Owner, value: string) => {
    setOwners(owners.map(o => o.id === id ? { ...o, [field]: value } : o));

    // Real-time validation
    const index = owners.findIndex(o => o.id === id);
    if (index === -1) return;
    const i = index + 1;

    if (field === 'name') {
      let key = fieldErrors.ownerName ? 'ownerName' : '';
      if (ownershipType.includes('joint')) key = `owner${i}Name`;

      if (key && fieldErrors[key]) {
        const err = getNameError(value, key === 'ownerName' ? 'Owner name' : `Owner ${i} name`);
        setFieldErrors(prev => {
          const next = { ...prev };
          if (!err) delete next[key];
          else next[key] = err;
          return next;
        });
      }
    } else if (field === 'ownership') {
      const key = `owner${i}Ownership`;
      if (fieldErrors[key] || fieldErrors.ownershipTotal) {
        const err = getOwnershipPercentError(value);
        setFieldErrors(prev => {
          const next = { ...prev };
          if (!err) delete next[key];
          else next[key] = err;
          // Also clear total error if individual is fixed (optimistic)
          if (!err) delete next.ownershipTotal;
          return next;
        });
      }
    }
  };

  const addTrustOwner = () => {
    if (trustOwners.length >= MAX_TRUST_OWNERS) {
      setError(`Maximum of ${MAX_TRUST_OWNERS} trust owners allowed`);
      return;
    }
    setTrustOwners([...trustOwners, { id: Date.now().toString(), trustName: '', companyTrustee: '', ownership: '' }]);
  };

  const removeTrustOwner = (id: string) => {
    if (trustOwners.length > 2) {
      setTrustOwners(trustOwners.filter(o => o.id !== id));
    }
  };

  const updateTrustOwner = (id: string, field: keyof TrustOwner, value: string) => {
    setTrustOwners(trustOwners.map(o => o.id === id ? { ...o, [field]: value } : o));

    // Real-time validation
    const index = trustOwners.findIndex(o => o.id === id);
    if (index === -1) return;
    const i = index + 1;

    let key = '';
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let validator = (_v: string) => undefined as string | undefined;

    if (field === 'trustName') {
      key = `trust${i}Name`;
      validator = (v) => getNameError(v, `Trust ${i} name`);
    } else if (field === 'companyTrustee') {
      key = `trust${i}Trustee`;
      validator = (v) => getNameError(v, `Trust ${i} trustee`);
    } else if (field === 'ownership') {
      key = `trust${i}Ownership`;
      validator = getOwnershipPercentError;
    }

    if (key && (fieldErrors[key] || (field === 'ownership' && fieldErrors.ownershipTotal))) {
      const err = validator(value);
      setFieldErrors(prev => {
        const next = { ...prev };
        if (!err) delete next[key];
        else next[key] = err;
        if (field === 'ownership' && !err) delete next.ownershipTotal;
        return next;
      });
    }
  };

  const addBank = () => {
    if (banks.length >= MAX_BANKS) {
      setError(`Maximum of ${MAX_BANKS} banks allowed`);
      return;
    }
    setBanks([...banks, {
      id: Date.now().toString(),
      bankName: '',
      bsbNumber: '',
      loanAccountNumber: '',
      loanAmount: '',
      loanAllocationPercent: '',
      allocateByDateRange: false,
      allocations: [],
      document: null,
    }]);
  };

  // Check for duplicate BSB numbers - reserved for inline validation
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _hasDuplicateBSB = (_bsb: string, _excludeId: string): boolean => {
    if (!_bsb || _bsb.length < 6) return false;
    const sanitizedBSB = _bsb.replace(/[^0-9]/g, '');
    return banks.some(b =>
      b.id !== _excludeId &&
      b.bsbNumber.replace(/[^0-9]/g, '') === sanitizedBSB
    );
  };

  const removeBank = (id: string) => {
    if (banks.length > 1) {
      setBanks(banks.filter(b => b.id !== id));
    }
  };

  const updateBank = (id: string, field: keyof BankDetails, value: string | boolean | LoanAllocation[] | { name: string; size: number; url?: string } | null) => {
    setBanks(banks.map(b => b.id === id ? { ...b, [field]: value } : b));

    if (typeof value !== 'string') return;

    // Real-time validation
    const index = banks.findIndex(b => b.id === id);
    if (index === -1) return;
    const i = index + 1;

    let key = '';
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let validator = (_v: string) => undefined as string | undefined;

    if (field === 'bankName') {
      key = `bank${i}Name`;
      validator = getBankNameError;
    } else if (field === 'bsbNumber') {
      key = `bank${i}BSB`;
      validator = getBSBError;
    } else if (field === 'loanAccountNumber') {
      key = `bank${i}Account`;
      validator = getLoanAccountError;
    } else if (field === 'loanAmount') {
      key = `bank${i}LoanAmount`;
      validator = getLoanAmountError;
    } else if (field === 'loanAllocationPercent') {
      key = `bank${i}Allocation`;
      validator = getOwnershipPercentError;
    }

    if (key && (fieldErrors[key] || (field === 'loanAllocationPercent' && fieldErrors.loanAllocation))) {
      const err = validator(value);
      setFieldErrors(prev => {
        const next = { ...prev };
        if (!err) delete next[key];
        else next[key] = err;
        if (field === 'loanAllocationPercent' && !err) delete next.loanAllocation;
        return next;
      });
    }
  };

  const addAllocation = (bankId: string) => {
    setBanks(banks.map(b => {
      if (b.id === bankId) {
        return {
          ...b,
          allocations: [...b.allocations, { id: Date.now().toString(), allocationPercent: '', fromDate: '', toDate: '' }]
        };
      }
      return b;
    }));
  };

  const removeAllocation = (bankId: string, allocId: string) => {
    setBanks(banks.map(b => {
      if (b.id === bankId) {
        return { ...b, allocations: b.allocations.filter(a => a.id !== allocId) };
      }
      return b;
    }));
  };

  const updateAllocation = (bankId: string, allocId: string, field: keyof LoanAllocation, value: string) => {
    setBanks(banks.map(b => {
      if (b.id === bankId) {
        return {
          ...b,
          allocations: b.allocations.map(a => a.id === allocId ? { ...a, [field]: value } : a)
        };
      }
      return b;
    }));
  };

  const getFullAddress = () => {
    if (locationMode === 'choose') return location;
    const parts = [streetNo, streetName, suburb, state, postCode].filter(Boolean);
    return parts.join(', ');
  };

  const getPropertyName = () => {
    if (locationMode === 'choose') return location;
    return `${streetNo} ${streetName}`.trim() || 'New Property';
  };

  const handleSubmit = async () => {
    // Prevent double submission
    if (isSubmitting) return;

    // Run all validations
    const step1Validation = validateStep1();
    const step2Validation = validateStep2();
    const step3Validation = validateStep3();

    const allErrors = {
      ...step1Validation.errors,
      ...step2Validation.errors,
      ...step3Validation.errors
    };

    if (Object.keys(allErrors).length > 0) {
      console.error('=== VALIDATION FAILED ===');
      console.error('Error count:', Object.keys(allErrors).length);
      Object.entries(allErrors).forEach(([field, error]) => {
        console.error(`  ${field}: ${error}`);
      });
      setError('Please correct the errors before saving.');
      setFieldErrors(allErrors);
      return;
    }

    const address = getFullAddress();
    const name = getPropertyName();

    if (!address) {
      setError('Please enter the property address');
      setFieldErrors({ address: 'Please enter the property address' });
      return;
    }

    setIsSubmitting(true);
    setError('');
    setFieldErrors({});

    console.log('=== SAVING PROPERTY ===');
    console.log('Edit mode:', isEditMode);
    console.log('Property ID:', property?.id);

    try {
      const data = new FormData();
      data.append('name', name);
      data.append('address', address);
      data.append('city', suburb);
      data.append('state', state);
      data.append('postalCode', postCode);
      const selectedPropertyType = PROPERTY_TYPES.find(t => t.value === propertyType);
      data.append('type', selectedPropertyType?.type || 'Residential');
      data.append('subType', 'other'); // Use 'other' which is in the allowed list
      data.append('usage', selectedPropertyType?.usage || 'Investment');
      data.append('marketValue', marketValue ? `$${marketValue.replace(/[$,]/g, '')}` : '$0');
      data.append('ownership', OWNERSHIP_TYPES.find(o => o.value === ownershipType)?.label || 'Individual');

      // Store ownership details as JSON
      const ownershipDetails = {
        type: ownershipType,
        owners: ownershipType.includes('joint') || SINGLE_OWNER_TYPES.includes(ownershipType) ? owners : undefined,
        trustOwners: ownershipType === 'trust-partnership' ? trustOwners : undefined,
        familyTrust: ownershipType === 'family-trust' ? { trustName: familyTrustName, companyTrustee: familyCompanyTrustee } : undefined,
        smsf: ownershipType === 'smsf' ? { trustName: smsfTrustName, companyTrustee: smsfCompanyTrustee, bareTrust: smsfBareTrust, bareTrustee: smsfBareTrustee } : undefined,
      };
      data.append('ownershipDetails', JSON.stringify(ownershipDetails));

      // Store loan details as JSON
      data.append('loanDetails', JSON.stringify(banks));
      data.append('hasDepreciation', hasDepreciation ? 'yes' : 'no');
      data.append('propertyStructure', propertyStructure);
      data.append('numberOfUnits', numberOfUnits);

      console.log('Calling API...');
      // Call update or add based on mode
      const result = isEditMode && property
        ? await updateProperty(property.id, data)
        : await addProperty(data);

      console.log('API result:', result);

      if (result.success) {
        console.log('Property saved successfully!');
        onSuccess?.();
        onClose();
      } else {
        console.error('Save failed:', result.error);
        setError(result.error || `Failed to ${isEditMode ? 'update' : 'add'} property`);
      }
    } catch (err) {
      console.error(`Error ${isEditMode ? 'updating' : 'adding'} property:`, err);
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step navigation with validation
  const handleNextStep = (targetStep: number) => {
    setError('');
    // Clear field errors when navigating? 
    // Usually better to keep them if they are still relevant, but for "Next", we are re-validating.
    // However, if we go BACK, we might want to clear.
    // Given the requirement "vanished at exact point", maintaining state is good. 
    // But validateStepX gives fresh state.

    if (targetStep === 2 && step === 1) {
      const validation = validateStep1();
      if (!validation.valid) {
        setFieldErrors(validation.errors);
        return;
      }
    }

    if (targetStep === 3 && step === 2) {
      const validation = validateStep2();
      if (!validation.valid) {
        setFieldErrors(validation.errors);
        return;
      }
    }

    setFieldErrors({}); // Clear errors when successfully moving to next step
    setStep(targetStep);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _canProceedStep1 = validateStep1().valid;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _canProceedStep2 = validateStep2().valid;



  const stepTitles = [
    { num: 1, label: 'Property Details' },
    { num: 2, label: 'Ownership Details' },
    { num: 3, label: 'Loan Details' },
  ];

  const stepDescriptions = [
    "Let's start with the basics! The more details you share, the better we can manage",
    "Add ownership info to keep your records clear and compliant. It only takes a moment!",
    "Add loan details to track your financing and calculate LVR accurately.",
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col bg-white">
        {/* Header */}
        <div className="p-6 border-b flex items-start gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            disabled={isSubmitting}
            className="shrink-0 mt-1"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">{isEditMode ? 'Edit Property' : 'Add Property'}</h2>
            <p className="text-gray-500 mt-1">{stepDescriptions[step - 1]}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            disabled={isSubmitting}
            className="shrink-0"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Step Indicator */}
        <div className="grid grid-cols-3 border-b">
          {stepTitles.map((s) => (
            <div
              key={s.num}
              className={`py-4 px-6 text-center transition-colors relative ${step === s.num
                ? 'bg-blue-600 text-white'
                : step > s.num
                  ? 'bg-blue-50 text-blue-600'
                  : 'bg-gray-50 text-gray-400'
                }`}
            >
              <div className="flex items-center justify-center gap-2">
                {step > s.num ? (
                  <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                ) : (
                  <span>{s.num}.</span>
                )}
                <span className="font-medium">{s.label}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Content */}
        <CardContent className="flex-1 overflow-y-auto p-6">
          {/* General error banner removed - field-level errors are sufficient */}

          {/* Step 1: Property Details */}
          {step === 1 && (
            <div className="space-y-6">
              {/* Location Mode Toggle */}
              <div className="flex items-center gap-6">
                {/* Replaced location mode toggle with simpler logic implicitly handled by mock search */}
              </div>

              {/* Location Input */}
              {locationMode === 'choose' ? (
                <div>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Enter Your Location"
                      className="pl-10 h-12 bg-gray-50 border-gray-200"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-gray-700">Street No<span className="text-red-500">*</span></Label>
                    <Input
                      placeholder="Enter street no"
                      className={cn("mt-2 h-11 bg-gray-50 border-gray-200", fieldErrors.streetNo && "border-red-500 focus-visible:ring-red-500")}
                      value={streetNo}
                      onChange={(e) => {
                        const val = e.target.value;
                        setStreetNo(val);
                        if (fieldErrors.streetNo) {
                          const err = getStreetNoError(val);
                          setFieldErrors(prev => { const n = { ...prev }; if (!err) delete n.streetNo; else n.streetNo = err; return n; });
                        }
                      }}
                    />
                    {fieldErrors.streetNo && (
                      <p className="text-sm text-red-500 mt-1">{fieldErrors.streetNo}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-gray-700">Street Name<span className="text-red-500">*</span></Label>
                    <Input
                      placeholder="Enter Street Name"
                      className={cn("mt-2 h-11 bg-gray-50 border-gray-200", fieldErrors.streetName && "border-red-500 focus-visible:ring-red-500")}
                      value={streetName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setStreetName(val);
                        if (fieldErrors.streetName) {
                          const err = getStreetNameError(val);
                          setFieldErrors(prev => { const n = { ...prev }; if (!err) delete n.streetName; else n.streetName = err; return n; });
                        }
                      }}
                    />
                    {fieldErrors.streetName && (
                      <p className="text-sm text-red-500 mt-1">{fieldErrors.streetName}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-gray-700">Suburb<span className="text-red-500">*</span></Label>
                    <Input
                      placeholder="Enter Suburb"
                      className={cn("mt-2 h-11 bg-gray-50 border-gray-200", fieldErrors.suburb && "border-red-500 focus-visible:ring-red-500")}
                      value={suburb}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSuburb(val);
                        if (fieldErrors.suburb) {
                          const err = getSuburbError(val);
                          setFieldErrors(prev => { const n = { ...prev }; if (!err) delete n.suburb; else n.suburb = err; return n; });
                        }
                      }}
                    />
                    {fieldErrors.suburb && (
                      <p className="text-sm text-red-500 mt-1">{fieldErrors.suburb}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-gray-700">State<span className="text-red-500">*</span></Label>
                    <Select
                      value={state}
                      onValueChange={(val) => {
                        setState(val);
                        if (fieldErrors.state) {
                          const err = getStateError(val);
                          setFieldErrors(prev => { const n = { ...prev }; if (!err) delete n.state; else n.state = err; return n; });
                        }
                      }}
                    >
                      <SelectTrigger className={cn("mt-2 h-11 bg-gray-50 border-gray-200", fieldErrors.state && "border-red-500 focus-visible:ring-red-500")}>
                        <SelectValue placeholder="Select State" />
                      </SelectTrigger>
                      <SelectContent>
                        {STATES.map(s => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldErrors.state && (
                      <p className="text-sm text-red-500 mt-1">{fieldErrors.state}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-gray-700">Post Code<span className="text-red-500">*</span></Label>
                    <Input
                      placeholder="Enter Post Code"
                      className={cn("mt-2 h-11 bg-gray-50 border-gray-200", fieldErrors.postCode && "border-red-500 focus-visible:ring-red-500")}
                      value={postCode}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPostCode(val);
                        if (fieldErrors.postCode) {
                          const err = getPostCodeError(val);
                          setFieldErrors(prev => { const n = { ...prev }; if (!err) delete n.postCode; else n.postCode = err; return n; });
                        }
                      }}
                    />
                    {fieldErrors.postCode && (
                      <p className="text-sm text-red-500 mt-1">{fieldErrors.postCode}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Market Value and Property Type */}
              <div className="grid grid-cols-2 gap-6 mt-6">
                <div>
                  <Label className="text-gray-700">Estimated Market Value<span className="text-red-500">*</span></Label>
                  <Input
                    placeholder="Estimated Market Value"
                    className={cn("mt-2 h-11 bg-gray-50 border-gray-200", fieldErrors.marketValue && "border-red-500 focus-visible:ring-red-500")}
                    value={marketValue}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setMarketValue(val);
                      if (fieldErrors.marketValue) {
                        const err = getMarketValueError(val);
                        setFieldErrors(prev => { const n = { ...prev }; if (!err) delete n.marketValue; else n.marketValue = err; return n; });
                      }
                    }}
                  />
                  {fieldErrors.marketValue && (
                    <p className="text-sm text-red-500 mt-1">{fieldErrors.marketValue}</p>
                  )}
                </div>
                <div>
                  <Label className="text-gray-700">Property Type<span className="text-red-500">*</span></Label>
                  <Select value={propertyType} onValueChange={setPropertyType}>
                    <SelectTrigger className={cn("mt-2 h-11 bg-gray-50 border-gray-200", fieldErrors.propertyType && "border-red-500 focus-visible:ring-red-500")}>
                      <SelectValue placeholder="Property Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROPERTY_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldErrors.propertyType && (
                    <p className="text-sm text-red-500 mt-1">{fieldErrors.propertyType}</p>
                  )}
                  {propertyType === 'residential-owner-occupied' && hasExistingOwnerOccupied && (
                    <p className="text-sm text-red-500 mt-2">You can add only one owner-occupied property.</p>
                  )}
                </div>
              </div>

              {/* Property Structure */}
              {propertyType && propertyType !== 'residential-owner-occupied' && (
                <div className="mt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Label className="text-gray-700">Property Structure</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="w-4 h-4 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Select the structure type of the property</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {PROPERTY_STRUCTURES.map(st => (
                      <Button
                        key={st.value}
                        type="button"
                        variant={propertyStructure === st.value ? 'default' : 'outline'}
                        onClick={() => {
                          setPropertyStructure(st.value);
                          setFieldErrors(prev => {
                            const n = { ...prev };
                            delete n.numberOfUnits;
                            return n;
                          });
                        }}
                        className={`rounded-full px-6 ${propertyStructure === st.value ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                      >
                        {st.label}
                      </Button>
                    ))}
                  </div>

                  {/* Dynamic Inputs for Structure */}
                  {(propertyStructure === 'rooming-house' || propertyStructure === 'block-of-units') && (
                    <div className="mt-4">
                      <Label className="text-gray-700">
                        {propertyStructure === 'rooming-house' ? 'Number of Rooms' : 'Number of Units'}<span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="number"
                        placeholder={propertyStructure === 'rooming-house' ? 'Enter number of rooms' : 'Enter number of units'}
                        className={cn("mt-2 h-11 bg-gray-50 border-gray-200 max-w-[200px]", fieldErrors.numberOfUnits && "border-red-500")}
                        value={numberOfUnits}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNumberOfUnits(val);
                          if (fieldErrors.numberOfUnits) {
                            const n = parseInt(val);
                            let err: string | undefined;
                            const isBlock = propertyStructure === 'block-of-units';

                            if (!val.trim() || isNaN(n)) err = isBlock ? 'Number of units is required' : 'Number of rooms is required';
                            else if (isBlock && n < 2) err = 'Number of units must be at least 2';
                            else if (isBlock && n > 20) err = 'Number of units cannot exceed 20';
                            else if (!isBlock && n < 1) err = 'Number of rooms must be at least 1';
                            else if (!isBlock && n > 20) err = 'Number of rooms cannot exceed 20';

                            setFieldErrors(prev => {
                              const newState = { ...prev };
                              if (!err) delete newState.numberOfUnits;
                              else newState.numberOfUnits = err;
                              return newState;
                            });
                          }
                        }}
                      />
                      {fieldErrors.numberOfUnits && (
                        <p className="text-sm text-red-500 mt-1">{fieldErrors.numberOfUnits}</p>
                      )}
                    </div>
                  )}

                  {/* Address Preview */}
                  {propertyStructure !== 'single-dwelling' && (
                    <div className="mt-8 bg-blue-50/50 rounded-xl p-6 border border-blue-100">
                      <h4 className="text-sm font-semibold text-gray-900 mb-4">Preview of generated addresses:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {getAddressPreview().map((addr, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                            <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                            <span>{addr}</span>
                          </div>
                        ))}
                        {getAddressPreview().length === 0 && (
                          <p className="text-sm text-gray-500 italic">Enter property details to see preview</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Depreciation Toggle */}
              <div className="mt-6">
                <Label className="text-gray-700">Depreciation Schedule Available?</Label>
                <div className="flex gap-3 mt-3">
                  <Button
                    type="button"
                    variant={hasDepreciation === true ? 'default' : 'outline'}
                    onClick={() => setHasDepreciation(true)}
                    className={`px-8 ${hasDepreciation === true ? 'bg-white text-gray-900 border-2 border-gray-300' : 'bg-gray-50 text-gray-600 border border-gray-200'}`}
                  >
                    Yes
                  </Button>
                  <Button
                    type="button"
                    variant={hasDepreciation === false ? 'default' : 'outline'}
                    onClick={() => setHasDepreciation(false)}
                    className={`px-8 ${hasDepreciation === false ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-600 border border-gray-200'}`}
                  >
                    No
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Ownership Details */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="max-w-md">
                <Label className="text-gray-700">Ownership Type<span className="text-red-500">*</span></Label>
                <Select
                  value={ownershipType}
                  onValueChange={(val) => {
                    setOwnershipType(val);
                    if (fieldErrors.ownershipType) {
                      const err = getOwnershipTypeError(val);
                      setFieldErrors(prev => { const n = { ...prev }; if (!err) delete n.ownershipType; else n.ownershipType = err; return n; });
                    }
                  }}
                >
                  <SelectTrigger className={cn("mt-2 h-11 bg-gray-50 border-gray-200", fieldErrors.ownershipType && "border-red-500 focus-visible:ring-red-500")}>
                    <SelectValue placeholder="Select ownership type" />
                  </SelectTrigger>
                  <SelectContent>
                    {OWNERSHIP_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldErrors.ownershipType && (
                  <p className="text-sm text-red-500 mt-1">{fieldErrors.ownershipType}</p>
                )}
              </div>

              {/* Individual, Company, Unit Trust — a single named owner at 100% */}
              {SINGLE_OWNER_TYPES.includes(ownershipType) && (
                <div className="bg-gray-50 rounded-xl p-6 mt-4">
                  <Label className="text-gray-700">
                    {ownershipType === 'company' ? 'Company Name' : ownershipType === 'unit-trust' ? 'Unit Trust Name' : 'Owner Name'}
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder={ownershipType === 'company' ? 'Enter company name' : ownershipType === 'unit-trust' ? 'Enter unit trust name' : 'Enter owner name'}
                    className={cn("mt-2 h-11 bg-white border-gray-200", fieldErrors.ownerName && "border-red-500 focus-visible:ring-red-500")}
                    value={owners[0]?.name || ''}
                    onChange={(e) => updateOwner('1', 'name', e.target.value)}
                  />
                  {fieldErrors.ownerName && (
                    <p className="text-sm text-red-500 mt-1">{fieldErrors.ownerName}</p>
                  )}
                </div>
              )}

              {/* Joint - Spouse */}
              {ownershipType === 'joint-spouse' && (
                <div className="bg-gray-50 rounded-xl p-6 mt-4 space-y-4">
                  {owners.map((owner, idx) => (
                    <div key={owner.id} className="grid grid-cols-[1fr_200px_auto] gap-4 items-end">
                      <div>
                        <Label className="text-gray-700">Name<span className="text-red-500">*</span></Label>
                        <Input
                          placeholder="Enter owner name"
                          className={cn("mt-2 h-11 bg-white border-gray-200", fieldErrors[`owner${idx + 1}Name`] && "border-red-500 focus-visible:ring-red-500")}
                          value={owner.name}
                          onChange={(e) => updateOwner(owner.id, 'name', e.target.value)}
                        />
                        {fieldErrors[`owner${idx + 1}Name`] && (
                          <p className="text-sm text-red-500 mt-1">{fieldErrors[`owner${idx + 1}Name`]}</p>
                        )}
                      </div>
                      <div>
                        <Label className="text-gray-700">Ownership<span className="text-red-500">*</span></Label>
                        <div className="relative mt-2">
                          <Input
                            type="number"
                            value={owner.ownership}
                            onChange={(e) => updateOwner(owner.id, 'ownership', e.target.value)}
                            className={cn("h-11 bg-white border-gray-200 pr-8", (fieldErrors[`owner${idx + 1}Ownership`] || fieldErrors.ownershipTotal) && "border-red-500 focus-visible:ring-red-500")}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                        </div>
                        {(fieldErrors[`owner${idx + 1}Ownership`] || fieldErrors.ownershipTotal) && (
                          <p className="text-sm text-red-500 mt-1">{fieldErrors[`owner${idx + 1}Ownership`] || fieldErrors.ownershipTotal}</p>
                        )}
                      </div>
                      {idx >= 2 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeOwner(owner.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {owners.length < MAX_OWNERS && (
                    <Button
                      variant="link"
                      onClick={addOwner}
                      className="text-blue-600 p-0 h-auto font-medium"
                    >
                      <Plus className="w-4 h-4 mr-1" /> Add Owner
                    </Button>
                  )}
                </div>
              )}

              {/* Joint - Other */}
              {ownershipType === 'joint-other' && (
                <div className="bg-gray-50 rounded-xl p-6 mt-4 space-y-4">
                  {owners.map((owner, idx) => (
                    <div key={owner.id} className="grid grid-cols-[1fr_200px_auto] gap-4 items-end">
                      <div>
                        <Label className="text-gray-700">Name<span className="text-red-500">*</span></Label>
                        <Input
                          placeholder="Enter partner name"
                          className={cn("mt-2 h-11 bg-white border-gray-200", fieldErrors[`owner${idx + 1}Name`] && "border-red-500 focus-visible:ring-red-500")}
                          value={owner.name}
                          onChange={(e) => updateOwner(owner.id, 'name', e.target.value)}
                        />
                        {fieldErrors[`owner${idx + 1}Name`] && (
                          <p className="text-sm text-red-500 mt-1">{fieldErrors[`owner${idx + 1}Name`]}</p>
                        )}
                      </div>
                      <div>
                        <Label className="text-gray-700">Ownership<span className="text-red-500">*</span></Label>
                        <div className="relative mt-2">
                          <Input
                            type="number"
                            value={owner.ownership}
                            onChange={(e) => updateOwner(owner.id, 'ownership', e.target.value)}
                            className={cn("h-11 bg-white border-gray-200 pr-8", (fieldErrors[`owner${idx + 1}Ownership`] || fieldErrors.ownershipTotal) && "border-red-500 focus-visible:ring-red-500")}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                        </div>
                        {(fieldErrors[`owner${idx + 1}Ownership`] || fieldErrors.ownershipTotal) && (
                          <p className="text-sm text-red-500 mt-1">{fieldErrors[`owner${idx + 1}Ownership`] || fieldErrors.ownershipTotal}</p>
                        )}
                      </div>
                      {idx >= 2 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeOwner(owner.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {owners.length < MAX_OWNERS && (
                    <Button
                      variant="link"
                      onClick={addOwner}
                      className="text-blue-600 p-0 h-auto font-medium"
                    >
                      <Plus className="w-4 h-4 mr-1" /> Add Partner
                    </Button>
                  )}
                </div>
              )}

              {/* Family Trust */}
              {ownershipType === 'family-trust' && (
                <div className="bg-gray-50 rounded-xl p-6 mt-4">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <Label className="text-gray-700">Trust Name<span className="text-red-500">*</span></Label>
                      <Input
                        placeholder="Enter trust name"
                        className={cn("mt-2 h-11 bg-white border-gray-200", fieldErrors.familyTrustName && "border-red-500 focus-visible:ring-red-500")}
                        value={familyTrustName}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFamilyTrustName(val);
                          if (fieldErrors.familyTrustName) {
                            const err = getNameError(val, 'Family trust name');
                            setFieldErrors(prev => { const n = { ...prev }; if (!err) delete n.familyTrustName; else n.familyTrustName = err; return n; });
                          }
                        }}
                      />
                      {fieldErrors.familyTrustName && (
                        <p className="text-sm text-red-500 mt-1">{fieldErrors.familyTrustName}</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-gray-700">Company Trustee<span className="text-red-500">*</span></Label>
                      <Input
                        placeholder="Enter company trustee"
                        className={cn("mt-2 h-11 bg-white border-gray-200", fieldErrors.familyCompanyTrustee && "border-red-500 focus-visible:ring-red-500")}
                        value={familyCompanyTrustee}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFamilyCompanyTrustee(val);
                          if (fieldErrors.familyCompanyTrustee) {
                            const err = getNameError(val, 'Family company trustee');
                            setFieldErrors(prev => { const n = { ...prev }; if (!err) delete n.familyCompanyTrustee; else n.familyCompanyTrustee = err; return n; });
                          }
                        }}
                      />
                      {fieldErrors.familyCompanyTrustee && (
                        <p className="text-sm text-red-500 mt-1">{fieldErrors.familyCompanyTrustee}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Trust - Partnership */}
              {ownershipType === 'trust-partnership' && (
                <div className="bg-gray-50 rounded-xl p-6 mt-4 space-y-4">
                  {trustOwners.map((owner, idx) => (
                    <div key={owner.id} className="grid grid-cols-[1fr_1fr_150px_auto] gap-4 items-end">
                      <div>
                        <Label className="text-gray-700">Trust Name<span className="text-red-500">*</span></Label>
                        <Input
                          placeholder="Enter trust name"
                          className={cn("mt-2 h-11 bg-white border-gray-200", fieldErrors[`trust${idx + 1}Name`] && "border-red-500 focus-visible:ring-red-500")}
                          value={owner.trustName}
                          onChange={(e) => updateTrustOwner(owner.id, 'trustName', e.target.value)}
                        />
                        {fieldErrors[`trust${idx + 1}Name`] && (
                          <p className="text-sm text-red-500 mt-1">{fieldErrors[`trust${idx + 1}Name`]}</p>
                        )}
                      </div>
                      <div>
                        <Label className="text-gray-700">Company Trustee<span className="text-red-500">*</span></Label>
                        <Input
                          placeholder="Enter company trustee"
                          className={cn("mt-2 h-11 bg-white border-gray-200", fieldErrors[`trust${idx + 1}Trustee`] && "border-red-500 focus-visible:ring-red-500")}
                          value={owner.companyTrustee}
                          onChange={(e) => updateTrustOwner(owner.id, 'companyTrustee', e.target.value)}
                        />
                        {fieldErrors[`trust${idx + 1}Trustee`] && (
                          <p className="text-sm text-red-500 mt-1">{fieldErrors[`trust${idx + 1}Trustee`]}</p>
                        )}
                      </div>
                      <div>
                        <Label className="text-gray-700">Ownership<span className="text-red-500">*</span></Label>
                        <div className="relative mt-2">
                          <Input
                            type="number"
                            value={owner.ownership}
                            onChange={(e) => updateTrustOwner(owner.id, 'ownership', e.target.value)}
                            className={cn("h-11 bg-white border-gray-200 pr-8", (fieldErrors[`trust${idx + 1}Ownership`] || fieldErrors.ownershipTotal) && "border-red-500 focus-visible:ring-red-500")}
                            placeholder="Enter %"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                        </div>
                        {(fieldErrors[`trust${idx + 1}Ownership`] || fieldErrors.ownershipTotal) && (
                          <p className="text-sm text-red-500 mt-1">{fieldErrors[`trust${idx + 1}Ownership`] || fieldErrors.ownershipTotal}</p>
                        )}
                      </div>
                      {idx >= 2 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeTrustOwner(owner.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    onClick={addTrustOwner}
                    className="text-blue-600 border-blue-600 hover:bg-blue-50"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Add Trust
                  </Button>
                </div>
              )}

              {/* SMSF */}
              {ownershipType === 'smsf' && (
                <div className="bg-gray-50 rounded-xl p-6 mt-4 space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <Label className="text-gray-700">Trust Name<span className="text-red-500">*</span></Label>
                      <Input
                        placeholder="Enter trust name"
                        className={cn("mt-2 h-11 bg-white border-gray-200", fieldErrors.smsfTrustName && "border-red-500 focus-visible:ring-red-500")}
                        value={smsfTrustName}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSmsfTrustName(val);
                          if (fieldErrors.smsfTrustName) {
                            const err = getSMSFTrustNameError(val);
                            setFieldErrors(prev => { const n = { ...prev }; if (!err) delete n.smsfTrustName; else n.smsfTrustName = err; return n; });
                          }
                        }}
                      />
                      {fieldErrors.smsfTrustName && (
                        <p className="text-sm text-red-500 mt-1">{fieldErrors.smsfTrustName}</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-gray-700">Company Trustee<span className="text-red-500">*</span></Label>
                      <Input
                        placeholder="Enter company trustee"
                        className={cn("mt-2 h-11 bg-white border-gray-200", fieldErrors.smsfCompanyTrustee && "border-red-500 focus-visible:ring-red-500")}
                        value={smsfCompanyTrustee}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSmsfCompanyTrustee(val);
                          if (fieldErrors.smsfCompanyTrustee) {
                            const err = getSMSFTrusteeError(val);
                            setFieldErrors(prev => { const n = { ...prev }; if (!err) delete n.smsfCompanyTrustee; else n.smsfCompanyTrustee = err; return n; });
                          }
                        }}
                      />
                      {fieldErrors.smsfCompanyTrustee && (
                        <p className="text-sm text-red-500 mt-1">{fieldErrors.smsfCompanyTrustee}</p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <Label className="text-gray-700">Property Bare Trust<span className="text-red-500">*</span></Label>
                      <Input
                        placeholder="Enter Property Bare Trust"
                        className={cn("mt-2 h-11 bg-white border-gray-200", fieldErrors.smsfBareTrust && "border-red-500 focus-visible:ring-red-500")}
                        value={smsfBareTrust}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSmsfBareTrust(val);
                          if (fieldErrors.smsfBareTrust) {
                            const err = getSMSFBareTrustError(val);
                            setFieldErrors(prev => { const n = { ...prev }; if (!err) delete n.smsfBareTrust; else n.smsfBareTrust = err; return n; });
                          }
                        }}
                      />
                      {fieldErrors.smsfBareTrust && (
                        <p className="text-sm text-red-500 mt-1">{fieldErrors.smsfBareTrust}</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-gray-700">Property Bare Trustee<span className="text-red-500">*</span></Label>
                      <Input
                        placeholder="Enter Property Bare trustee"
                        className={cn("mt-2 h-11 bg-white border-gray-200", fieldErrors.smsfBareTrustee && "border-red-500 focus-visible:ring-red-500")}
                        value={smsfBareTrustee}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSmsfBareTrustee(val);
                          if (fieldErrors.smsfBareTrustee) {
                            const err = getSMSFBareTrusteeError(val);
                            setFieldErrors(prev => { const n = { ...prev }; if (!err) delete n.smsfBareTrustee; else n.smsfBareTrustee = err; return n; });
                          }
                        }}
                      />
                      {fieldErrors.smsfBareTrustee && (
                        <p className="text-sm text-red-500 mt-1">{fieldErrors.smsfBareTrustee}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Loan Details */}
          {step === 3 && (
            <div className="space-y-6">
              {banks.map((bank, bankIdx) => (
                <div key={bank.id} className="bg-gray-50 rounded-xl p-6 space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">Bank {bankIdx + 1}</h3>
                      <span className={cn(
                        "text-xs font-medium px-2 py-0.5 rounded-full",
                        bankIdx === 0 ? "bg-blue-100 text-blue-700" : "bg-gray-200 text-gray-600"
                      )}>
                        {bankIdx === 0 ? 'Primary' : 'Secondary'}
                      </span>
                    </div>
                    {bankIdx > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeBank(bank.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4 mr-1" /> Remove
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <Label className="text-gray-700">Bank Name</Label>
                      <Select
                        value={bank.bankName}
                        onValueChange={(v) => updateBank(bank.id, 'bankName', v)}
                      >
                        <SelectTrigger className={cn("mt-2 h-11 bg-white border-gray-200", fieldErrors.bank1Name && "border-red-500 focus-visible:ring-red-500")}>
                          <SelectValue placeholder="Select Bank" />
                        </SelectTrigger>
                        <SelectContent>
                          {BANKS.map(b => (
                            <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldErrors.bank1Name && (
                        <p className="text-sm text-red-500 mt-1">{fieldErrors.bank1Name}</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-gray-700">BSB Number</Label>
                      <Input
                        placeholder="BSB Number"
                        className={cn("mt-2 h-11 bg-white border-gray-200", fieldErrors.bank1BSB && "border-red-500 focus-visible:ring-red-500")}
                        value={bank.bsbNumber}
                        onChange={(e) => updateBank(bank.id, 'bsbNumber', e.target.value)}
                      />
                      {fieldErrors.bank1BSB && (
                        <p className="text-sm text-red-500 mt-1">{fieldErrors.bank1BSB}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <Label className="text-gray-700">Loan Account Number</Label>
                      <Input
                        placeholder="Loan Account Number"
                        className={cn("mt-2 h-11 bg-white border-gray-200", fieldErrors.bank1Account && "border-red-500 focus-visible:ring-red-500")}
                        value={bank.loanAccountNumber}
                        onChange={(e) => updateBank(bank.id, 'loanAccountNumber', e.target.value)}
                      />
                      {fieldErrors.bank1Account && (
                        <p className="text-sm text-red-500 mt-1">{fieldErrors.bank1Account}</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-gray-700">Loan Amount</Label>
                      <div className="relative mt-2">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                        <Input
                          placeholder="0.00"
                          className={cn("h-11 bg-white border-gray-200 pl-7", fieldErrors.bank1LoanAmount && "border-red-500 focus-visible:ring-red-500")}
                          value={bank.loanAmount}
                          onChange={(e) => updateBank(bank.id, 'loanAmount', e.target.value)}
                        />
                      </div>
                      {fieldErrors.bank1LoanAmount && (
                        <p className="text-sm text-red-500 mt-1">{fieldErrors.bank1LoanAmount}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <Label className="text-gray-700 flex items-center gap-1">
                        Loan Allocation %
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-blue-600 text-sm font-normal cursor-pointer">Info</span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs p-4">
                              <p className="font-semibold mb-2">Loan Allocation %</p>
                              <p className="text-sm">The share of this loan&apos;s balance and interest that should be attributed to this property. Use 100% if the loan was drawn entirely for this property; a lower % if the same loan facility is split across multiple properties.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </Label>
                      <Input
                        placeholder="Allocation %"
                        className={cn("mt-2 h-11 bg-white border-gray-200", (fieldErrors.bank1Allocation || fieldErrors.loanAllocation) && "border-red-500 focus-visible:ring-red-500")}
                        value={bank.loanAllocationPercent}
                        onChange={(e) => updateBank(bank.id, 'loanAllocationPercent', e.target.value)}
                      />
                      {(fieldErrors.bank1Allocation || fieldErrors.loanAllocation) && (
                        <p className="text-sm text-red-500 mt-1">{fieldErrors.bank1Allocation || fieldErrors.loanAllocation}</p>
                      )}
                    </div>
                  </div>

                  {/* Allocate by date range checkbox */}
                  <div className="flex items-center gap-2 pt-2">
                    <Checkbox
                      id={`allocate-${bank.id}`}
                      checked={bank.allocateByDateRange}
                      onCheckedChange={(checked) => {
                        updateBank(bank.id, 'allocateByDateRange', checked as boolean);
                        if (checked && bank.allocations.length === 0) {
                          addAllocation(bank.id);
                        }
                      }}
                    />
                    <label htmlFor={`allocate-${bank.id}`} className="text-sm text-gray-600 cursor-pointer">
                      Allocate loan usage by percentage and date range
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-blue-600 ml-1 cursor-pointer">Info</span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-sm p-4">
                            <p className="text-sm">Use this when a single loan is drawn down at different times for different properties.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </label>
                  </div>

                  {/* Date Range Allocations */}
                  {bank.allocateByDateRange && (
                    <div className="bg-white rounded-lg p-4 space-y-4 border border-gray-200">
                      {bank.allocations.map((alloc, idx) => (
                        <div key={alloc.id} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-4 items-end">
                          <div>
                            <Label className="text-gray-700 flex items-center gap-1">
                              Allocation %
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="text-blue-600 text-sm font-normal cursor-pointer">Info</span>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <p className="text-sm">Enter the percentage allocation for this period.</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </Label>
                            <Input
                              placeholder="Allocation %"
                              className="mt-2 h-11 bg-gray-50 border-gray-200"
                              value={alloc.allocationPercent}
                              onChange={(e) => updateAllocation(bank.id, alloc.id, 'allocationPercent', e.target.value)}
                            />
                          </div>
                          <div>
                            <Label className="text-gray-700">From Date<span className="text-red-500">*</span></Label>
                            <Input
                              type="date"
                              className="mt-2 h-11 bg-gray-50 border-gray-200"
                              value={alloc.fromDate}
                              onChange={(e) => updateAllocation(bank.id, alloc.id, 'fromDate', e.target.value)}
                            />
                          </div>
                          <div>
                            <Label className="text-gray-700">To Date</Label>
                            <Input
                              type="date"
                              placeholder="To Date"
                              className="mt-2 h-11 bg-gray-50 border-gray-200"
                              value={alloc.toDate}
                              onChange={(e) => updateAllocation(bank.id, alloc.id, 'toDate', e.target.value)}
                            />
                          </div>
                          {idx > 0 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeAllocation(bank.id, alloc.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <p className="text-sm text-gray-500">* If loan is on-going then keep To Date blank</p>
                      <Button
                        variant="link"
                        onClick={() => addAllocation(bank.id)}
                        className="text-blue-600 p-0 h-auto font-medium"
                      >
                        <Plus className="w-4 h-4 mr-1" /> Add Interest
                      </Button>
                    </div>
                  )}

                  {/* Document Upload */}
                  <div>
                    <Label className="text-gray-700">
                      Loan Document (Optional)
                      <span className="text-gray-400 font-normal ml-2">Upload supporting documents (PDF, JPG, PNG - max 20MB)</span>
                    </Label>
                    <input
                      type="file"
                      ref={(el) => { fileInputRefs.current[bank.id] = el; }}
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        e.target.value = ''; // allow re-selecting the same file later
                        if (!file) return;

                        // Check file size (max 20MB)
                        if (file.size > 20 * 1024 * 1024) {
                          alert('File size exceeds 20MB limit');
                          return;
                        }

                        setUploadingDocFor(prev => ({ ...prev, [bank.id]: true }));
                        try {
                          const result = await documentsApi.upload(file, 'loan-documents');
                          if (result.success && result.data?.url) {
                            updateBank(bank.id, 'document', {
                              name: file.name,
                              size: file.size,
                              url: result.data.url,
                            });
                          } else {
                            alert(result.error || 'Failed to upload document. Please try again.');
                          }
                        } finally {
                          setUploadingDocFor(prev => ({ ...prev, [bank.id]: false }));
                        }
                      }}
                    />
                    {uploadingDocFor[bank.id] ? (
                      <div className="mt-2 border-2 border-dashed border-gray-200 rounded-lg p-6 text-center bg-white flex flex-col items-center">
                        <Loader2 className="w-6 h-6 text-blue-500 animate-spin mb-2" />
                        <p className="text-gray-500">Uploading…</p>
                      </div>
                    ) : bank.document ? (
                      // Show uploaded file with checkmark
                      <div className="mt-2 border-2 border-green-200 rounded-lg p-4 bg-green-50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                            <Check className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 truncate max-w-[300px]">{bank.document.name}</p>
                            <p className="text-sm text-gray-500">
                              {(bank.document.size / 1024).toFixed(1)} KB
                              {bank.document.url && (
                                <>
                                  {' · '}
                                  <button
                                    type="button"
                                    onClick={() => openDocument(bank.document!.url!)}
                                    className="text-blue-600 hover:underline"
                                  >
                                    View
                                  </button>
                                </>
                              )}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateBank(bank.id, 'document', null)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      // Show upload area
                      <div
                        className="mt-2 border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:border-blue-400 transition-colors cursor-pointer bg-white"
                        onClick={() => fileInputRefs.current[bank.id]?.click()}
                      >
                        <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                        <p className="text-gray-500">Click to Upload Document</p>
                        <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG up to 20MB</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              <Button
                variant="link"
                onClick={addBank}
                className="text-blue-600 p-0 h-auto font-medium"
              >
                <Plus className="w-4 h-4 mr-1" /> Add More Bank
              </Button>
            </div>
          )}
        </CardContent>

        {/* Footer */}
        <div className="p-6 border-t bg-white flex justify-end gap-3">
          {step > 1 && (
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              disabled={isSubmitting}
              className="px-8"
            >
              Back
            </Button>
          )}

          {step < 3 ? (
            <Button
              onClick={() => handleNextStep(step + 1)}
              className="px-8 bg-blue-600 hover:bg-blue-700"
            >
              Next
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-8 bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Property'
              )}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
