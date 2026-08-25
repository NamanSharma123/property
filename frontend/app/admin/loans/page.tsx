"use client";

import LoansTable from '@/app/admin/_components/Loans/LoansTable';
import { useIsFullAdmin } from '@/app/admin/_components/AdminSessionContext';

export default function AdminLoansPage() {
  const isFullAdmin = useIsFullAdmin();
  return <LoansTable isFullAdmin={isFullAdmin} />;
}
