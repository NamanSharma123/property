"use client";

import CategoriesPanel from '@/app/admin/_components/Categories/CategoriesPanel';
import { useIsFullAdmin } from '@/app/admin/_components/AdminSessionContext';

export default function AdminCategoriesPage() {
  const isFullAdmin = useIsFullAdmin();
  return <CategoriesPanel isFullAdmin={isFullAdmin} />;
}
