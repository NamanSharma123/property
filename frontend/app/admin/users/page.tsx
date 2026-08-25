"use client";

import UsersTable from '@/app/admin/_components/Users/UsersTable';
import { useIsFullAdmin } from '@/app/admin/_components/AdminSessionContext';

export default function AdminUsersPage() {
  const isFullAdmin = useIsFullAdmin();
  return <UsersTable isFullAdmin={isFullAdmin} />;
}
