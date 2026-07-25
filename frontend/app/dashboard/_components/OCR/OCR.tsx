'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Upload, Download, Printer, MoreVertical, Trash2, Plus, ChevronUp, ChevronDown, Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { addMultipleTransactions } from '@/lib/transaction';
import { processDocument, extractLineItemsForTransactions } from '@/lib/ocrService';
import { documentsApi } from '@/lib/api';
import { toast } from 'sonner';
import { usePropertiesSWR } from '@/hooks/usePropertiesSWR';
import { useRouter } from 'next/navigation';
import type { ExtractedData } from '@/lib/ocrParser';
import { format } from "date-fns";


interface DetailRow {
  id: string;
  category: string;
  amount: string;
  // The extracted line item's own description (e.g. "Rent payment 15/07/2024
  // to 21/07/2024"), distinct per row even when category+amount repeat
  // across several weekly rent payments. Carried through to save so the
  // backend's duplicate-transaction check (same property+date+type+amount+
  // description+category) doesn't collapse genuinely separate transactions
  // into "duplicates" of each other.
  description?: string;
}

interface OCRPageProps {
  onBackClick?: () => void;
  /** Pre-select this property (and enforce statement-address matching against it)
   *  when arriving from that property's "Add Income / Expense" button. */
  initialPropertyId?: string;
}

export default function OCRPage({ onBackClick, initialPropertyId }: OCRPageProps) {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatus, setOcrStatus] = useState('');

  // Load properties using SWR hook
  const { properties, isLoading: isLoadingProperties } = usePropertiesSWR();
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);

  // Came in from a specific property's page — pre-select it once properties load.
  useEffect(() => {
    if (initialPropertyId && !selectedProperty && properties.some(p => p.id === initialPropertyId)) {
      setSelectedProperty(initialPropertyId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPropertyId, properties]);

  // State for dates using Date objects (or undefined)
  const [statementDate, setStatementDate] = useState<Date | undefined>(new Date());
  const [startDate, setStartDate] = useState<Date | undefined>(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());

  const [details, setDetails] = useState<DetailRow[]>([
    { id: '1', category: 'rental-income', amount: '' },
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // ... existing useEffects ...

  const processFileWithOCR = async (file: File) => {
    setIsProcessingOCR(true);
    setOcrProgress(0);
    setOcrStatus('Starting processing...');
    setError('');

    try {
      const result = await processDocument(file, (progress, status) => {
        setOcrProgress(progress);
        setOcrStatus(status || 'Processing...');
      });

      if (!result.success || !result.extractedData) {
        setError(result.error || 'Failed to extract data from document');
        setIsProcessingOCR(false);
        return;
      }

      const extractedData = result.extractedData;

      // Store extracted data for filtering later
      setExtractedData(extractedData);

      const cameFromProperty = Boolean(initialPropertyId) && selectedProperty === initialPropertyId;

      // Check for properties in the document that aren't in the system
      // (skip this generic check when we're strictly matching against the
      // pre-selected property below — that path has its own, more specific message)
      if (!cameFromProperty && extractedData.properties.length > 0 && !isLoadingProperties) {
        const missingFromSystem = extractedData.properties.filter(extractedProp => {
          // 1. Only report if there are actual transactions for this property
          if (!extractedProp.lineItems || extractedProp.lineItems.length === 0) return false;

          // 2. Ignore generic fallback name
          const fallbackName = "Extracted Transactions";
          if (extractedProp.propertyName === fallbackName) return false;

          const normalize = (name: string) => name.toLowerCase().trim().replace(/\s+/g, ' ').replace(/,\s*/g, ', ');
          const sectionNameNormalized = normalize(extractedProp.propertyName);

          return !properties.some(p => {
            const filterNameNormalized = normalize(p.name);

            // Helper to extract key components for strict matching
            const extractKeyComponents = (name: string) => {
              const words = name.split(/[\s,]+/);
              const numberMatch = words[0]?.match(/(\d+[a-z]?\/?\d*[a-z]?)/);
              const streetTypeIndex = words.findIndex(w => /^(st|street|rd|road|ave|avenue|dr|drive|ct|court|pl|place|way|ln|lane|blvd|boulevard|cres|crescent|pde|parade|tce|terrace|hwy|highway)$/i.test(w));
              return {
                number: numberMatch ? numberMatch[1] : '',
                street: streetTypeIndex > 0 ? words[streetTypeIndex - 1] : (words.length > 1 ? words[1] : words[0])
              };
            };

            const sectionComponents = extractKeyComponents(sectionNameNormalized);
            const filterComponents = extractKeyComponents(filterNameNormalized);

            // Match strategies
            if (sectionNameNormalized === filterNameNormalized) return true;

            // If both have numbers, they MUST match exactly
            if (sectionComponents.number && filterComponents.number) {
              if (sectionComponents.number !== filterComponents.number) return false;
            }

            // Street name check
            return sectionComponents.street && filterComponents.street &&
              (sectionComponents.street.includes(filterComponents.street) || filterComponents.street.includes(sectionComponents.street));
          });
        });

        if (missingFromSystem.length > 0) {
          const firstMissing = missingFromSystem[0].propertyName;
          toast.warning("Different Property Detected", {
            description: `Different property detected: "${firstMissing}". Create the property to save the transactions.`,
            duration: 10000,
          });
        }
      }

      // Auto-select property if match found (simplified)
      if (extractedData.folioNumber || extractedData.properties.length > 0) {
        // Logic to match property could be added here if we had property metadata in frontend
      }

      // Helper to convert extracted string to Date object
      const convertToDateObj = (dateStr: string | null): Date | undefined => {
        if (!dateStr) return undefined;
        try {
          // Normalize separators
          const cleanStr = dateStr.replace(/[/-]/g, ' ').trim();
          const parts = cleanStr.split(/\s+/);

          // STRICT DD MM YYYY Handling for numeric dates
          const isNumeric = parts.every(p => !isNaN(parseInt(p)));

          if (parts.length === 3 && isNumeric) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed in JS Date
            const yearVal = parts[2];

            // Handle 2-digit years
            let year = parseInt(yearVal, 10);
            if (yearVal.length === 2) year += 2000;

            // Check validity
            const date = new Date(year, month, day);
            if (!isNaN(date.getTime()) && date.getDate() === day) {
              return date;
            }
          }

          // Fallback: Try standard Date parsing for alphanumeric (e.g. "26 Jan 2026")
          const date = new Date(cleanStr);
          if (!isNaN(date.getTime())) {
            return date;
          }

          return undefined;
        } catch (e) {
          console.error("Date parsing error:", e);
          return undefined;
        }
      };

      // Populate dates if found
      if (extractedData.statementPeriod) {
        const startObj = convertToDateObj(extractedData.statementPeriod.from);
        const endObj = convertToDateObj(extractedData.statementPeriod.to);
        const statementObj = convertToDateObj(extractedData.statementDate); // Use explicit statement date

        if (startObj) setStartDate(startObj);
        if (endObj) setEndDate(endObj);

        if (statementObj) {
          setStatementDate(statementObj);
        } else if (endObj) {
          setStatementDate(endObj); // Fallback to end date ONLY if statement date is missing
        }
      }

      // If property is already selected, filter by it; otherwise show all items
      const selectedPropertyName = selectedProperty
        ? properties.find(p => p.id === selectedProperty)?.name
        : null;

      const transactions = extractLineItemsForTransactions(
        extractedData,
        selectedProperty || 'temp',
        30,
        selectedPropertyName || undefined
      );

      // Statement actually names a property (not just the generic fallback bucket)
      const namedSections = extractedData.properties.filter(
        p => p.propertyName && p.propertyName !== 'Extracted Transactions' && p.lineItems?.length
      );

      if (cameFromProperty && namedSections.length > 0 && transactions.length === 0) {
        // The statement has an address, but it doesn't match the property the user
        // came from — per spec, add nothing and tell them to check the address.
        setError(`The address on this statement doesn't match "${selectedPropertyName}". Please check the address and try again.`);
        toast.error('Address does not match', {
          description: `This statement is for "${namedSections[0].propertyName}", not "${selectedPropertyName}". Nothing was added.`,
          duration: 10000,
        });
        return;
      }

      if (transactions.length > 0) {
        const newDetails = transactions.map(t => ({
          id: Date.now().toString() + Math.random().toString().slice(2),
          category: t.category,
          amount: t.amount.toString(),
          description: t.description,
        }));
        setDetails(newDetails);
        toast.success('OCR Complete', { description: `Extracted ${transactions.length} items` });
      } else {
        toast.warning('No confidence items found', { description: 'Please enter details manually' });
      }

    } catch (err) {
      console.error('OCR Error:', err);
      setError('An error occurred during OCR processing');
    } finally {
      setIsProcessingOCR(false);
      setOcrStatus('');
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setError('File size too large. Please upload a file smaller than 10MB.');
        return;
      }
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      processFileWithOCR(file);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setError('File size too large. Please upload a file smaller than 10MB.');
        return;
      }
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      processFileWithOCR(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const addDetailRow = () => {
    setDetails([...details, { id: Date.now().toString(), category: '', amount: '' }]);
  };

  const removeDetailRow = (id: string) => {
    if (details.length > 1) {
      setDetails(details.filter(d => d.id !== id));
    }
  };

  const updateDetailRow = (id: string, field: 'category' | 'amount', value: string) => {
    setDetails(details.map(d => d.id === id ? { ...d, [field]: value } : d));
    setError('');
  };

  // Filter line items when property is selected
  const handlePropertyChange = (propertyId: string) => {
    setSelectedProperty(propertyId);

    // If we have extracted data, filter line items by selected property
    if (extractedData && propertyId) {
      const selectedPropertyName = properties.find(p => p.id === propertyId)?.name;
      if (selectedPropertyName) {
        const transactions = extractLineItemsForTransactions(
          extractedData,
          propertyId,
          30,
          selectedPropertyName
        );

        if (transactions.length > 0) {
          const newDetails = transactions.map(t => ({
            id: Date.now().toString() + Math.random().toString().slice(2),
            category: t.category,
            amount: t.amount.toString(),
            description: t.description,
          }));
          setDetails(newDetails);
          toast.success('Filtered by property', { description: `Showing ${transactions.length} items for ${selectedPropertyName}` });
        } else {
          setDetails([{ id: '1', category: 'rental-income', amount: '' }]);
          toast.info('No items found', { description: `No transactions found for ${selectedPropertyName} in this invoice` });
        }
      }
    }
  };

  const handleSave = async () => {
    // Validate property selection
    if (!selectedProperty) {
      setError('Please select a property');
      return;
    }

    // Validate details
    const validDetails = details.filter(d => d.category && d.amount);
    if (validDetails.length === 0) {
      setError('Please add at least one detail with category and amount');
      return;
    }

    // Validate amounts
    const MAX_AMOUNT = 999999999;
    const invalidAmounts: string[] = [];
    const zeroAmounts: string[] = [];

    validDetails.forEach((detail, index) => {
      const amount = parseFloat(detail.amount);
      if (isNaN(amount) || amount < 0) {
        invalidAmounts.push(`Row ${index + 1}: Invalid amount`);
      } else if (amount === 0) {
        zeroAmounts.push(`Row ${index + 1}`);
      } else if (amount > MAX_AMOUNT) {
        invalidAmounts.push(`Row ${index + 1}: Amount exceeds maximum ($999,999,999)`);
      }
    });

    if (invalidAmounts.length > 0) {
      setError(invalidAmounts.join('. '));
      return;
    }

    // Warn about zero amounts but allow proceeding
    if (zeroAmounts.length > 0) {
      const proceed = confirm(`Warning: ${zeroAmounts.join(', ')} have $0 amounts. Continue anyway?`);
      if (!proceed) return;
    }

    // Validate date is not in the future
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (statementDate && statementDate > today) {
      const proceed = confirm('Warning: Transaction date is in the future. Continue anyway?');
      if (!proceed) return;
    }

    const property = properties.find(p => p.id === selectedProperty);
    if (!property) {
      setError('Selected property not found');
      return;
    }

    setIsSaving(true);
    setError('');

    // Format dates to YYYY-MM-DD for backend
    // Since we validated existence above, we can safely format
    const statementDateStr = format(statementDate!, 'yyyy-MM-dd');
    const startDateStr = format(startDate!, 'yyyy-MM-dd');
    const endDateStr = format(endDate!, 'yyyy-MM-dd');

    try {
      // Store the uploaded file (statement, receipt, report, whatever) so it's
      // attached to the transactions it produced — not just the extracted data.
      let receiptUrl: string | undefined;
      if (selectedFile) {
        const uploadResult = await documentsApi.upload(selectedFile);
        if (uploadResult.success && uploadResult.data?.url) {
          receiptUrl = uploadResult.data.url;
        } else {
          toast.warning('Document not saved', {
            description: 'The transaction(s) will still be saved, but the uploaded file itself could not be stored.',
          });
        }
      }

      const transactionItems = validDetails.map(detail => ({
        propertyId: selectedProperty,
        propertyName: property.name,
        propertyType: property.type || 'Residential',
        category: detail.category,
        amount: parseFloat(detail.amount) || 0,
        date: statementDateStr,
        transactionSource: 'OCR Upload' as const,
        // Distinguishes otherwise-identical rows (e.g. several weekly rent
        // payments of the same amount) so the backend's duplicate-transaction
        // check doesn't reject legitimate separate transactions as repeats.
        ...(detail.description ? { description: detail.description } : {}),
        statementDate: statementDateStr,
        startDate: startDateStr,
        endDate: endDateStr,
        ...(receiptUrl ? { receiptUrl } : {}),
      }));

      const result = await addMultipleTransactions(transactionItems);

      if ((result.count || 0) > 0) {
        // Reset form
        setSelectedFile(null);
        setPreviewUrl(null);
        setExtractedData(null);
        setDetails([{ id: '1', category: '', amount: '' }]);
        setSelectedProperty('');
        setStatementDate(new Date());
        setStartDate(() => { const d = new Date(); d.setDate(1); return d; });
        setEndDate(new Date());

        if (result.success) {
          toast.success('Transactions Saved', {
            description: `Successfully saved ${result.count} transaction(s)!`,
          });
        } else {
          // Some rows saved, others were rejected (e.g. as duplicates of an
          // already-saved transaction) — still navigate, but be explicit
          // about the partial result instead of claiming full success.
          toast.warning('Some transactions were not saved', {
            description: `Saved ${result.count} of ${transactionItems.length}. ${result.failures?.[0] || ''}`,
            duration: 10000,
          });
        }

        // Navigate to transactions page with property filter
        const propertyName = property.name;
        if (onBackClick) {
          // Store property filter in sessionStorage to apply after navigation
          sessionStorage.setItem('ocrPropertyFilter', propertyName);
          onBackClick(); // Go back to transactions page
        } else {
          // If no onBackClick, navigate directly
          sessionStorage.setItem('ocrPropertyFilter', propertyName);
          router.push('/dashboard/transactions');
        }
      } else {
        setError(result.failures?.[0] || result.error || 'Failed to save transactions');
      }
    } catch (err) {
      console.error('Error saving transactions:', err);
      setError('An unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this record?')) {
      setSelectedFile(null);
      setPreviewUrl(null);
      setExtractedData(null);
      setDetails([{ id: '1', category: 'rental-income', amount: '' }]);
      setSelectedProperty('');
    }
  };

  // Reusable date input component (matching transactions page style)
  const DateInput = ({
    date,
    setDate,
    label,
    required = false
  }: {
    date: Date | undefined;
    setDate: (d: Date | undefined) => void;
    label: string;
    required?: boolean
  }) => {
    // Get today's date in YYYY-MM-DD format for max date validation
    const today = new Date().toISOString().split('T')[0];

    // Convert Date to YYYY-MM-DD string for input value
    const dateValue = date ? format(date, 'yyyy-MM-dd') : '';

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (value) {
        setDate(new Date(value));
      } else {
        setDate(undefined);
      }
    };

    return (
      <div>
        <Label className="block text-sm font-medium text-gray-700">
          {label}{required && <span className="text-red-500">*</span>}
        </Label>
        <div className="relative mt-1.5">
          <Input
            type="date"
            max={today}
            className="pr-8 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:top-0 [&::-webkit-calendar-picker-indicator]:left-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
            value={dateValue}
            onChange={handleChange}
          />
          <CalendarIcon className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>
      </div>
    );
  };

  const categories = [
    {
      group: 'Income', items: [
        { value: 'rental-income', label: 'Rental Income' },
        { value: 'other-rental-income', label: 'Other rental related income' },
        { value: 'variable-outgoings-received', label: 'Variable Outgoings Received' },
        { value: 'insurance-recoveries', label: 'Insurance Recoveries' },
        { value: 'booking-short-stay-income', label: 'Booking / Short Stay Income' },
      ]
    },
    {
      group: 'Expense', items: [
        { value: 'council-rates', label: 'Council rates' },
        { value: 'water-rates', label: 'Water Rates' },
        { value: 'gardening', label: 'Gardening' },
        { value: 'accounting-legal', label: 'Accounting & Legal Expense' },
        { value: 'pest-control', label: 'Pest Control' },
        { value: 'management-fees', label: 'Management fees' },
        { value: 'property-agent-fees', label: 'Property agent other fees' },
        { value: 'adjustment-at-purchase', label: 'Adjustment at purchase' },
        { value: 'gas-electricity', label: 'Gas and Electricity' },
        { value: 'repairs-maintenance', label: 'Repair & Maintenance' },
        { value: 'land-tax', label: 'Land Tax' },
        { value: 'sundry-rental-expenses', label: 'Sundry rental expenses' },
        { value: 'depreciation', label: 'Depreciation (from Schedule)' },
        { value: 'interest-on-loans', label: 'Interest on loans' },
        { value: 'loan-setup-cost', label: 'Loan Set Up Cost' },
        { value: 'lmi', label: 'LMI (Lender Mortgage Insurance)' },
        { value: 'bank-fees', label: 'Bank Fees' },
        { value: 'insurance', label: 'Insurance' },
        { value: 'compliance-testing', label: 'Compliance & Testing' },
        { value: 'advertising', label: 'Advertising for Tenant' },
        { value: 'body-corporate', label: 'Body Corporate Fees' },
        { value: 'borrowing-expenses', label: 'Borrowing Expenses' },
        { value: 'cleaning', label: 'Cleaning' },
        { value: 'variable-outgoings-paid', label: 'Variable Outgoings Paid' },
        { value: 'water-usage', label: 'Water Usage' },
        { value: 'utility-levy', label: 'Utility Levy' },
        { value: 'internet', label: 'Internet' },
      ]
    },
    {
      group: 'Cost', items: [
        { value: 'purchase-cost', label: 'Purchase Cost' },
        { value: 'stamp-duty', label: 'Stamp Duty' },
        { value: 'conveyancer-fees', label: 'Conveyancer Fees' },
        { value: 'bank-fees-capitalised', label: 'Bank Fees Capitalised' },
        { value: 'body-corporate-sinking-fund', label: 'Body Corporate - Sinking Fund' },
        { value: 'building-pest-inspection', label: 'Building and Pest Inspection' },
        { value: 'buyer-agent-fees', label: 'Buyer agent fees' },
        { value: 'capital-improvement', label: 'Capital Improvement' },
        { value: 'construction-cost', label: 'Construction Cost' },
        { value: 'conveyancer-purchases', label: 'Conveyancer Purchases' },
        { value: 'conveyancer-selling', label: 'Conveyancer Selling' },
        { value: 'council-rates-capitalised', label: 'Council Rates Capitalised' },
        { value: 'demolition-cost', label: 'Demolition Cost' },
        { value: 'equipment-cost', label: 'Equipment Cost' },
        { value: 'expenses-capitalised', label: 'Expenses capitalised' },
        { value: 'insurance-capitalised', label: 'Insurance Capitalised' },
        { value: 'interest-capitalised', label: 'Interest Capitalised' },
        { value: 'land-tax-capitalised', label: 'Land Tax Capitalised' },
        { value: 'lmi-capitalised', label: 'LMI (Lender Mortgage Insurance)' },
        { value: 'loan-setup-cost-capitalised', label: 'Loan Set Up Cost' },
        { value: 'pexa-fees', label: 'Pexa Fees' },
        { value: 'plans-permit', label: 'Plans & permit' },
        { value: 'repairs-capitalised', label: 'Repairs Capitalised' },
        { value: 'selling-agent-advertising-fees', label: 'Selling agent & advertising fees' },
        { value: 'staging-fees', label: 'Staging fees' },
        { value: 'sub-division-cost', label: 'Sub-division Cost' },
        { value: 'title-insurance', label: 'Title Insurance' },
        { value: 'title-registration', label: 'Title Registration' },
        { value: 'water-rates-capitalised', label: 'Water Rates Capitalised' },
        { value: 'depreciation-schedule-capitalised', label: 'Depreciation (from Schedule)' },
        { value: 'depreciation-manual', label: 'Depreciation Manual' },
        { value: 'lmi-expenses-recognized', label: 'LMI expenses recognized as expense' },
        { value: 'loan-setup-costs-expenses-recognized', label: 'Loan Set up costs expenses recognized as expense' },
        { value: 'dep-div-43', label: 'Dep-Div 43(Capital Improvements)' },
        { value: 'dep-div-40', label: 'Dep-Div 40(Equipment Cost)' },
      ]
    },
  ];

  return (
    <div className="w-full px-6 py-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={onBackClick}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Record Expense</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left side - Document Preview */}
        <Card className="shadow-xl rounded-2xl border border-gray-200 overflow-hidden bg-[#3a3a3a]">
          <CardContent className="p-0">
            {/* Toolbar */}
            <div className="flex items-center justify-end gap-2 p-4 border-b border-gray-600">
              <Button variant="ghost" size="icon" className="text-white hover:bg-gray-600">
                <Download className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-white hover:bg-gray-600">
                <Printer className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-white hover:bg-gray-600">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </div>

            {/* Document Preview Area */}
            <div className="relative min-h-[500px] flex items-center justify-center p-6">
              {previewUrl ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  {selectedFile?.type === 'application/pdf' ? (
                    <iframe src={previewUrl} className="w-full h-[500px] bg-white rounded-lg" />
                  ) : (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={previewUrl} alt="Document preview" className="max-w-full max-h-[500px] object-contain rounded-lg shadow-lg" />
                    </>
                  )}
                  {/* Scroll indicators */}
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-2">
                    <div className="w-2 h-16 bg-gray-500 rounded-full opacity-50" />
                  </div>
                </div>
              ) : (
                <div
                  className="border-2 border-dashed border-gray-500 rounded-lg p-16 text-center hover:border-gray-400 transition-colors cursor-pointer bg-[#4a4a4a] flex flex-col items-center justify-center w-full"
                  onClick={() => document.getElementById('file-upload')?.click()}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                >
                  <Upload className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-300 font-medium">Click or drag file to upload</p>
                  <p className="text-gray-400 text-sm mt-2">(.jpg, .jpeg, .png, .pdf)</p>
                  <input
                    id="file-upload"
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              )}

              {/* OCR Processing Overlay */}
              {isProcessingOCR && (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center rounded-lg z-10 backdrop-blur-sm">
                  <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                  <p className="text-white font-medium text-lg">{ocrStatus}</p>
                  {ocrProgress > 0 && (
                    <div className="w-64 h-2 bg-gray-700 rounded-full mt-4 overflow-hidden">
                      <div
                        className="h-full bg-blue-500 transition-all duration-300"
                        style={{ width: `${ocrProgress}%` }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Bottom scroll indicator */}
              {previewUrl && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                  <ChevronDown className="w-6 h-6 text-gray-400" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right side - Form */}
        <Card className="shadow-xl rounded-2xl border border-gray-100 overflow-hidden">
          <CardContent className="p-6 bg-white">
            <div className="space-y-5">
              {/* Row 1: Property & Statement Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="select-property" className="text-sm font-medium text-gray-700">
                    Select Property<span className="text-red-500">*</span>
                  </Label>
                  <Select value={selectedProperty} onValueChange={handlePropertyChange}>
                    <SelectTrigger id="select-property" className="mt-1.5">
                      <SelectValue placeholder="Select Property" />
                    </SelectTrigger>
                    <SelectContent>
                      {properties.map((property) => (
                        <SelectItem key={property.id} value={property.id}>
                          {property.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <DateInput
                  date={statementDate}
                  setDate={setStatementDate}
                  label="Statement Date"
                  required
                />
              </div>

              {/* Row 2: Start Date & End Date */}
              <div className="grid grid-cols-2 gap-4">
                <DateInput
                  date={startDate}
                  setDate={setStartDate}
                  label="Start Date"
                  required
                />

                <DateInput
                  date={endDate}
                  setDate={setEndDate}
                  label="End Date"
                  required
                />
              </div>

              {/* Row 3: Property Type (Read-only) */}
              <div>
                <Label className="text-sm font-medium text-gray-700">Property Type</Label>
                <div className="mt-1.5 px-3 py-2 bg-gray-100 rounded-md text-gray-700 border">
                  {properties.find(p => p.id === selectedProperty)?.type || 'Residential'}
                </div>
              </div>

              {/* Details Section */}
              <div className="border rounded-lg overflow-hidden">
                {/* Header */}
                <div className="grid grid-cols-[1fr,150px,40px] gap-2 px-4 py-3 bg-gray-50 border-b">
                  <div className="text-sm font-medium text-gray-700">Details</div>
                  <div className="text-sm font-medium text-gray-700 text-right">Amount</div>
                  <div></div>
                </div>

                {/* Scroll indicator top */}
                <div className="flex justify-end px-4 pt-2">
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                </div>

                {/* Detail Rows */}
                <div className="px-4 py-2 space-y-3 max-h-[200px] overflow-y-auto">
                  {details.map((detail) => (
                    <div key={detail.id} className="grid grid-cols-[1fr,150px,40px] gap-2 items-center">
                      <Select
                        value={detail.category}
                        onValueChange={(value) => updateDetailRow(detail.id, 'category', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((group) => (
                            <div key={group.group}>
                              <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase">
                                {group.group}
                              </div>
                              {group.items.map((item) => (
                                <SelectItem key={item.value} value={item.value}>
                                  {item.label}
                                </SelectItem>
                              ))}
                            </div>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={detail.amount}
                        onChange={(e) => updateDetailRow(detail.id, 'amount', e.target.value)}
                        className="text-right"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeDetailRow(detail.id)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Add Button */}
                <div className="flex justify-center py-3 border-t">
                  <Button
                    onClick={addDetailRow}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </div>

                {/* Scroll indicator bottom */}
                <div className="flex justify-end px-4 pb-2">
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={handleDelete}
                  disabled={isSaving}
                  className="text-red-500 border-red-300 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save'
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}