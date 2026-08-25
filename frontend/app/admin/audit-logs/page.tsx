"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AuditLogsTable from "@/app/admin/_components/AuditLogs/AuditLogsTable";
import { useIsFullAdmin } from "@/app/admin/_components/AdminSessionContext";

export default function AdminAuditLogsPage() {
  const isFullAdmin = useIsFullAdmin();
  const router = useRouter();

  useEffect(() => {
    // Audit logs are Admin-only (Support Admins can't see them per the
    // permission matrix) — the sidebar already hides this link for them,
    // but guard the route directly too in case it's opened by URL.
    if (!isFullAdmin) router.push('/admin/dashboard');
  }, [isFullAdmin, router]);

  if (!isFullAdmin) return null;
  return <AuditLogsTable />;
}
