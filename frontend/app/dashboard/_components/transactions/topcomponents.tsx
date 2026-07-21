'use client';
import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalendarIcon } from "lucide-react";
import { getProperties } from "@/lib/property";
import { MultiSelect, MultiSelectOption } from "@/components/ui/multi-select";

// Transaction source options (static)
const TRANSACTION_SOURCE_OPTIONS: MultiSelectOption[] = [
  { value: "Bank Feed", label: "Bank Feed" },
  { value: "Rental Summary", label: "Rental Summary" },
  { value: "Manual Entry", label: "Manual Entry" },
  { value: "OCR Upload", label: "OCR Upload" },
];

// Category options with groups
const CATEGORY_OPTIONS: MultiSelectOption[] = [
  // Income categories
  { value: "rental-income", label: "Rental Income", group: "income" },
  { value: "other-rental-income", label: "Other rental related income", group: "income" },
  { value: "variable-outgoings-received", label: "Variable Outgoings Received", group: "income" },

  // Expense categories
  { value: "council-rates", label: "Council rates", group: "expense" },
  { value: "water-rates", label: "Water Rates", group: "expense" },
  { value: "gardening", label: "Gardening", group: "expense" },
  { value: "accounting-legal", label: "Accounting & Legal Expense", group: "expense" },
  { value: "pest-control", label: "Pest Control", group: "expense" },
  { value: "management-fees", label: "Management fees", group: "expense" },
  { value: "property-agent-fees", label: "Property agent other fees", group: "expense" },
  { value: "adjustment-at-purchase", label: "Adjustment at purchase", group: "expense" },
  { value: "gas-electricity", label: "Gas and Electricity", group: "expense" },
  { value: "repairs-maintenance", label: "Repair & Maintenance", group: "expense" },
  { value: "land-tax", label: "Land Tax", group: "expense" },
  { value: "sundry-rental-expenses", label: "Sundry rental expenses", group: "expense" },
  { value: "depreciation", label: "Depreciation (from Schedule)", group: "expense" },
  { value: "interest-on-loans", label: "Interest on loans", group: "expense" },
  { value: "loan-setup-cost", label: "Loan Set Up Cost", group: "expense" },
  { value: "lmi", label: "LMI (Lender Mortgage Insurance)", group: "expense" },
  { value: "bank-fees", label: "Bank Fees", group: "expense" },
  { value: "insurance", label: "Insurance", group: "expense" },
  { value: "compliance-testing", label: "Compliance & Testing", group: "expense" },
  { value: "advertising", label: "Advertising for Tenant", group: "expense" },
  { value: "body-corporate", label: "Body Corporate Fees", group: "expense" },
  { value: "borrowing-expenses", label: "Borrowing Expenses", group: "expense" },
  { value: "cleaning", label: "Cleaning", group: "expense" },
  { value: "variable-outgoings-paid", label: "Variable Outgoings Paid", group: "expense" },
  { value: "water-usage", label: "Water Usage", group: "expense" },
  { value: "utility-levy", label: "Utility Levy", group: "expense" },
  { value: "internet", label: "Internet", group: "expense" },

  // Cost categories
  { value: "purchase-cost", label: "Purchase Cost", group: "cost" },
  { value: "stamp-duty", label: "Stamp Duty", group: "cost" },
  { value: "conveyancer-fees", label: "Conveyancer Fees", group: "cost" },
];

const CATEGORY_GROUP_LABELS: Record<string, string> = {
  income: "Income",
  expense: "Expense",
  cost: "Cost",
};

export const TopComponents = ({
  onAddIncomeExpenseClick,
  onFilterChange,
  initialFilters,
}: {
  onAddIncomeExpenseClick: () => void;
  onFilterChange: (filters: { fromDate: string; toDate: string; property: string[]; transactionSource: string[]; category: string[] }) => void;
  initialFilters?: { fromDate: string; toDate: string; property: string[]; transactionSource: string[]; category: string[] };
}) => {
  const [fromDate, setFromDate] = useState(initialFilters?.fromDate || "");
  const [toDate, setToDate] = useState(initialFilters?.toDate || "");
  const [property, setProperty] = useState<string[]>(initialFilters?.property || []);
  const [transactionSource, setTransactionSource] = useState<string[]>(initialFilters?.transactionSource || []);
  const [category, setCategory] = useState<string[]>(initialFilters?.category || []);

  // Property list for the filter — from the user's actual properties, not
  // just ones that happen to already have a transaction (a property with
  // zero transactions still needs to be selectable/filterable).
  const [propertyOptions, setPropertyOptions] = useState<MultiSelectOption[]>([]);
  const [isLoadingProperties, setIsLoadingProperties] = useState(false);

  // Date validation error state
  const [dateError, setDateError] = useState<string | null>(null);

  // Debounce ref with proper type
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ref to hold latest onFilterChange to avoid stale closures
  const onFilterChangeRef = useRef(onFilterChange);
  onFilterChangeRef.current = onFilterChange;

  // Apply property filter from OCR if available (check sessionStorage on mount)
  useEffect(() => {
    const ocrPropertyFilter = sessionStorage.getItem('ocrPropertyFilter');
    if (ocrPropertyFilter && !property.includes(ocrPropertyFilter)) {
      setProperty([ocrPropertyFilter]);
      // Clear the sessionStorage so it doesn't persist on refresh
      sessionStorage.removeItem('ocrPropertyFilter');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount - intentionally excluding 'property' to avoid re-triggering

  // Load the user's full property list (not derived from transactions —
  // properties with zero transactions still need to be filterable).
  const loadPropertyOptions = useCallback(async (signal?: AbortSignal) => {
    setIsLoadingProperties(true);
    try {
      const properties = await getProperties();

      // Check if aborted before setting state
      if (signal?.aborted) return;

      const uniqueNames = Array.from(
        new Set(properties.map(p => p.name).filter((name): name is string => Boolean(name?.trim())))
      ).sort();

      setPropertyOptions(
        uniqueNames.map(name => ({ value: name, label: name }))
      );
    } catch (error) {
      if (signal?.aborted) return;
      console.error('Failed to load property options:', error);
    } finally {
      if (!signal?.aborted) {
        setIsLoadingProperties(false);
      }
    }
  }, []);

  useEffect(() => {
    const abortController = new AbortController();
    loadPropertyOptions(abortController.signal);

    // Reload when window becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadPropertyOptions(abortController.signal);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      abortController.abort();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadPropertyOptions]);

  const handleReset = () => {
    setFromDate("");
    setToDate("");
    setProperty([]);
    setTransactionSource([]);
    setCategory([]);
    setDateError(null);
    // call parent immediately on reset
    onFilterChangeRef.current({ fromDate: "", toDate: "", property: [], transactionSource: [], category: [] });
  };

  // Date validation helper
  const datesValid = (from: string, to: string): boolean => {
    if (!from || !to) return true; // treat empty as valid (unbounded)
    return new Date(from) <= new Date(to); // from should be before or equal to to
  };

  // Get today's date in YYYY-MM-DD format for max date validation
  const today = new Date().toISOString().split('T')[0];

  // Central effect: whenever any filter changes, call onFilterChange (debounced)
  useEffect(() => {
    // Validate dates and set error state
    if (!datesValid(fromDate, toDate)) {
      setDateError("'From Date' must be on or before 'To Date'");
      return;
    }
    setDateError(null);

    // Debounce calls to onFilterChange
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      onFilterChangeRef.current({
        fromDate,
        toDate,
        property,
        transactionSource,
        category,
      });
    }, 300);

    // Cleanup on unmount or re-run
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [fromDate, toDate, property, transactionSource, category]);

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Transactions</h1>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-2 md:text-base md:px-4 md:py-2" onClick={onAddIncomeExpenseClick}>
          + Add Income / Expense
        </Button>
      </div>
      <p className="text-gray-500 mb-4">List of all the transactions</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6 items-end px-3 py-2 rounded-lg">
        <div>
          <label className="block text-sm font-medium text-gray-700">From Date</label>
          <div className="relative mt-1">
            <Input
              type="date"
              max={today}
              className={`pr-8 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:top-0 [&::-webkit-calendar-picker-indicator]:left-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer ${dateError ? 'border-red-500' : ''}`}
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
            <CalendarIcon className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">To Date</label>
          <div className="relative mt-1">
            <Input
              type="date"
              max={today}
              className={`pr-8 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:top-0 [&::-webkit-calendar-picker-indicator]:left-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer ${dateError ? 'border-red-500' : ''}`}
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
            <CalendarIcon className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
          {dateError && (
            <p className="text-red-500 text-xs mt-1">{dateError}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Property</label>
          <div className="mt-1">
            <MultiSelect
              options={propertyOptions}
              selected={property}
              onChange={setProperty}
              placeholder={isLoadingProperties ? "Loading..." : "Choose Property"}
              emptyMessage="No properties found"
              maxDisplayItems={1}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Transaction Source</label>
          <div className="mt-1">
            <MultiSelect
              options={TRANSACTION_SOURCE_OPTIONS}
              selected={transactionSource}
              onChange={setTransactionSource}
              placeholder="Choose Source"
              maxDisplayItems={1}
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex-grow">
            <label className="block text-sm font-medium text-gray-700">Category</label>
            <div className="mt-1">
              <MultiSelect
                options={CATEGORY_OPTIONS}
                selected={category}
                onChange={setCategory}
                placeholder="Choose Category"
                emptyMessage="No categories found"
                maxDisplayItems={1}
                groupLabels={CATEGORY_GROUP_LABELS}
              />
            </div>
          </div>
          <div className="pt-5">
            <Button className="bg-yellow-500 hover:bg-yellow-600 text-white" onClick={handleReset}>
              Reset
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
