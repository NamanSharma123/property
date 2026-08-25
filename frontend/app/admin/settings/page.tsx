"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import SettingsPanel from "@/app/admin/_components/Settings/SettingsPanel";
import { useIsFullAdmin } from "@/app/admin/_components/AdminSessionContext";

export default function AdminSettingsPage() {
  const isFullAdmin = useIsFullAdmin();
  const router = useRouter();

  useEffect(() => {
    if (!isFullAdmin) router.push('/admin/dashboard');
  }, [isFullAdmin, router]);

  if (!isFullAdmin) return null;
  return <SettingsPanel />;
}
