'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Pencil, Trash2, Loader2, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { removeTransaction } from "@/lib/transaction";
import { toast } from 'sonner';
import { useTransactionsSWR } from "@/hooks/useTransactionsSWR";
import { TransactionTableSkeleton } from "@/components/ui/skeletons";

type SortKey = 'propertyName' | 'categoryLabel' | 'transactionSource' | 'propertyType' | 'date' | 'amount' | 'createdAt';
type SortDirection = 'asc' | 'desc';

// Helper function to parse dates (kept as is)
const parseDate = (dateString: string): Date | null => {
  if (!dateString) return null;

  let formattedDateString = dateString;

  // Check for DD-MM-YYYY format and reformat to YYYY-MM-DD
  const dd_mm_yyyy_match = dateString.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dd_mm_yyyy_match) {
    const day = dd_mm_yyyy_match[1];
    const month = dd_mm_yyyy_match[2];
    const year = dd_mm_yyyy_match[3];
    formattedDateString = `${year}-${month}-${day}`;
  } else {
    // If not DD-MM-YYYY, assume it's already YYYY-MM-DD or attempt a direct parse
    const yyyy_mm_dd_match = dateString.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (!yyyy_mm_dd_match) {
      try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return null;
        return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      } catch {
        return null;
      }
    }
  }

  try {
    const date = new Date(formattedDateString + 'T00:00:00Z');
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
};

export const TransactionsTable = ({ filters }: { filters: { fromDate: string; toDate: string; property: string[]; transactionSource: string[]; category: string[] } }) => {
  const { transactions, isLoading, refresh } = useTransactionsSWR();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const itemsPerPage = 10;

  async function handleDelete(transactionId: string) {
    if (!confirm('Are you sure you want to delete this transaction?')) return;

    setDeletingId(transactionId);
    try {
      const result = await removeTransaction(transactionId);
      if (result.success) {
        refresh();
        toast.success('Transaction deleted successfully');
      } else {
        toast.error(result.error || 'Failed to delete transaction');
      }
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      toast.error('Failed to delete transaction');
    } finally {
      setDeletingId(null);
    }
  }

  const filteredTransactions = transactions.filter((transaction) => {
    const transactionDate = parseDate(transaction.date);
    const filterFromDate = parseDate(filters.fromDate);
    const filterToDate = parseDate(filters.toDate);

    if (!transactionDate) return false;

    let fromDateMatch = true;
    if (filterFromDate) {
      fromDateMatch = transactionDate.getTime() >= filterFromDate.getTime();
    }

    let toDateMatch = true;
    if (filterToDate) {
      const filterToDatePlusOneDay = new Date(Date.UTC(
        filterToDate.getFullYear(),
        filterToDate.getMonth(),
        filterToDate.getDate() + 1
      ));
      toDateMatch = transactionDate.getTime() < filterToDatePlusOneDay.getTime();
    }

    const transactionPropertyName = (transaction.propertyName || '').toLowerCase().trim();
    const transactionSourceLower = (transaction.transactionSource || '').toLowerCase().trim();
    const transactionCategoryValue = (transaction.category || '').toLowerCase().trim();

    const filterPropertyLower = filters.property.map(p => p.toLowerCase().trim());
    const filterSourceLower = filters.transactionSource.map(s => s.toLowerCase().trim());
    const filterCategoryLower = filters.category.map(c => c.toLowerCase().trim());

    const propertyMatch = filterPropertyLower.length > 0
      ? filterPropertyLower.includes(transactionPropertyName)
      : true;
    const transactionSourceMatch = filterSourceLower.length > 0
      ? filterSourceLower.includes(transactionSourceLower)
      : true;
    const categoryMatch = filterCategoryLower.length > 0
      ? filterCategoryLower.includes(transactionCategoryValue)
      : true;

    return fromDateMatch && toDateMatch && propertyMatch && transactionSourceMatch && categoryMatch;
  });

  // Handle sort column click
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      // Toggle direction if same key
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      // New key, default to descending (newest first)
      setSortKey(key);
      setSortDirection('desc');
    }
    setCurrentPage(1); // Reset to first page when sorting
  };

  // Sort icon helper
  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortKey !== columnKey) {
      return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />;
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="ml-1 h-3 w-3" />
      : <ArrowDown className="ml-1 h-3 w-3" />;
  };

  // Sort transactions
  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    const multiplier = sortDirection === 'asc' ? 1 : -1;

    switch (sortKey) {
      case 'propertyName':
      case 'categoryLabel':
      case 'transactionSource':
      case 'propertyType':
        return multiplier * (a[sortKey] || '').localeCompare(b[sortKey] || '');
      case 'amount':
        return multiplier * (a.amount - b.amount);
      case 'date': {
        const dateA = parseDate(a.date)?.getTime() || 0;
        const dateB = parseDate(b.date)?.getTime() || 0;
        return multiplier * (dateA - dateB);
      }
      case 'createdAt': {
        const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return multiplier * (createdA - createdB);
      }
      default:
        return 0;
    }
  });

  // Pagination
  const totalPages = Math.ceil(sortedTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTransactions = sortedTransactions.slice(startIndex, startIndex + itemsPerPage);

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <TransactionTableSkeleton />
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <Table>
        <TableHeader className="bg-gray-50">
          <TableRow>
            <TableHead
              className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
              onClick={() => handleSort('propertyName')}
            >
              <div className="flex items-center">
                Property Name
                <SortIcon columnKey="propertyName" />
              </div>
            </TableHead>
            <TableHead
              className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
              onClick={() => handleSort('categoryLabel')}
            >
              <div className="flex items-center">
                Category
                <SortIcon columnKey="categoryLabel" />
              </div>
            </TableHead>
            <TableHead className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Details
            </TableHead>
            <TableHead
              className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
              onClick={() => handleSort('transactionSource')}
            >
              <div className="flex items-center">
                Transaction Source
                <SortIcon columnKey="transactionSource" />
              </div>
            </TableHead>
            <TableHead
              className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
              onClick={() => handleSort('propertyType')}
            >
              <div className="flex items-center">
                Property Type
                <SortIcon columnKey="propertyType" />
              </div>
            </TableHead>
            <TableHead
              className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
              onClick={() => handleSort('date')}
            >
              <div className="flex items-center">
                Date
                <SortIcon columnKey="date" />
              </div>
            </TableHead>
            <TableHead
              className="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
              onClick={() => handleSort('amount')}
            >
              <div className="flex items-center justify-end">
                Amount
                <SortIcon columnKey="amount" />
              </div>
            </TableHead>
            <TableHead className="py-3 px-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-gray-200">
          {paginatedTransactions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="py-8 text-center text-gray-500">
                No transactions found
              </TableCell>
            </TableRow>
          ) : (
            paginatedTransactions.map((transaction) => (
              <TableRow key={transaction.id} className="hover:bg-gray-50">
                <TableCell className="py-4 px-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {transaction.propertyName}
                </TableCell>
                <TableCell className="py-4 px-4 whitespace-nowrap text-sm text-gray-500">
                  {transaction.categoryLabel}
                </TableCell>
                <TableCell className="py-4 px-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex flex-col">
                    {transaction.unitLabel && (
                      <span className="text-xs font-medium text-gray-700">Unit {transaction.unitLabel}</span>
                    )}
                    {transaction.description && (
                      <span className="text-xs text-gray-400 max-w-[200px] truncate" title={transaction.description}>
                        {transaction.description}
                      </span>
                    )}
                    {!transaction.unitLabel && !transaction.description && (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="py-4 px-4 whitespace-nowrap text-sm text-gray-500">
                  {transaction.transactionSource}
                </TableCell>
                <TableCell className="py-4 px-4 whitespace-nowrap text-sm text-gray-500">
                  {transaction.propertyType}
                </TableCell>
                <TableCell className="py-4 px-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex flex-col">
                    <span>{transaction.date ? (() => {
                      const parsed = parseDate(transaction.date);
                      if (parsed) {
                        return parsed.toLocaleDateString('en-AU', {
                          timeZone: 'UTC',
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        });
                      }
                      return transaction.date.substring(0, 10);
                    })() : ''}</span>
                    {transaction.createdAt && (
                      <span className="text-xs text-gray-400">
                        Saved: {new Date(transaction.createdAt).toLocaleString('en-AU', {
                          timeZone: 'Australia/Sydney',
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className={`py-4 px-4 whitespace-nowrap text-sm text-right font-medium ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                  }`}>
                  {transaction.type === 'income' ? '+' : '-'}${transaction.amount.toFixed(2)}
                </TableCell>
                <TableCell className="py-4 px-4 whitespace-nowrap text-center text-sm font-medium">
                  <div className="flex items-center justify-center gap-1">
                    <Button variant="outline" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-900 border-blue-200 hover:border-blue-400">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 text-red-600 hover:text-red-900 border-red-200 hover:border-red-400"
                      onClick={() => handleDelete(transaction.id)}
                      disabled={deletingId === transaction.id}
                    >
                      {deletingId === transaction.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <div className="flex justify-between items-center mt-6 px-4 py-3 bg-gray-50 rounded-b-lg">
        <Button
          variant="outline"
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          className="text-gray-500 border-gray-300"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Previous
        </Button>
        <span className="text-sm text-gray-500">
          Page {currentPage} of {totalPages || 1} ({filteredTransactions.length} transactions)
        </span>
        <Button
          variant="outline"
          disabled={currentPage >= totalPages}
          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
          className="text-blue-600 border-blue-200 hover:border-blue-400"
        >
          Next <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};
