"use client";

import { use } from "react";
import UserDetail from "@/app/admin/_components/Users/UserDetail";
import { useIsFullAdmin } from "@/app/admin/_components/AdminSessionContext";

export default function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const isFullAdmin = useIsFullAdmin();
  return <UserDetail userId={id} isFullAdmin={isFullAdmin} />;
}
