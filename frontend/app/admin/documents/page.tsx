"use client";

import DocumentsTable from '@/app/admin/_components/Documents/DocumentsTable';
import { useIsFullAdmin } from '@/app/admin/_components/AdminSessionContext';

export default function AdminDocumentsPage() {
  const isFullAdmin = useIsFullAdmin();
  return <DocumentsTable isFullAdmin={isFullAdmin} />;
}
