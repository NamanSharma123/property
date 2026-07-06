'use client';
import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TransactionsTable } from "./table";
import { TopComponents } from "./topcomponents";

const Transactions = () => {
  const router = useRouter();
  const [filters, setFilters] = useState<{
    fromDate: string;
    toDate: string;
    property: string[];
    transactionSource: string[];
    category: string[];
  }>({
    fromDate: "",
    toDate: "",
    property: [],
    transactionSource: [],
    category: [],
  });

  // Apply property filter from OCR if available
  useEffect(() => {
    const ocrPropertyFilter = sessionStorage.getItem('ocrPropertyFilter');
    if (ocrPropertyFilter) {
      // Set the property filter
      setFilters(prev => ({
        ...prev,
        property: [ocrPropertyFilter],
      }));
      // Clear the sessionStorage so it doesn't persist on refresh
      sessionStorage.removeItem('ocrPropertyFilter');
    }
  }, []);

  const handleAddIncomeExpenseClick = () => {
    router.push('/dashboard/ocr');
  };

  // Memoized to prevent infinite re-renders in child component
  const handleFilterChange = useCallback((newFilters: typeof filters) => {
    setFilters(newFilters);
  }, []);

  return (
    <div className="w-full px-6 py-2">
      <TopComponents 
        onAddIncomeExpenseClick={handleAddIncomeExpenseClick} 
        onFilterChange={handleFilterChange}
        initialFilters={filters}
      />
      <TransactionsTable filters={filters} />
    </div>
  );
};

export default Transactions;
