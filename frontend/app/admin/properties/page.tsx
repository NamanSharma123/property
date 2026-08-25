"use client";

import PropertiesTable from '@/app/admin/_components/Properties/PropertiesTable';
import { useIsFullAdmin } from '@/app/admin/_components/AdminSessionContext';

export default function AdminPropertiesPage() {
  const isFullAdmin = useIsFullAdmin();
  return <PropertiesTable isFullAdmin={isFullAdmin} />;
}
