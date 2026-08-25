"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import ReportsPanel from "@/app/admin/_components/Reports/ReportsPanel";
import { useIsFullAdmin } from "@/app/admin/_components/AdminSessionContext";

export default function AdminReportsPage() {
  const isFullAdmin = useIsFullAdmin();
  const router = useRouter();

  useEffect(() => {
    if (!isFullAdmin) router.push('/admin/dashboard');
  }, [isFullAdmin, router]);

  if (!isFullAdmin) return null;
  return <ReportsPanel />;
}
