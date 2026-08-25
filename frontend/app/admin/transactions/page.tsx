"use client";

import TransactionsTable from '@/app/admin/_components/Transactions/TransactionsTable';
import { useIsFullAdmin } from '@/app/admin/_components/AdminSessionContext';

export default function AdminTransactionsPage() {
  const isFullAdmin = useIsFullAdmin();
  return <TransactionsTable isFullAdmin={isFullAdmin} />;
}
