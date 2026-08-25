"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import SubscriptionsPanel from "@/app/admin/_components/Subscriptions/SubscriptionsPanel";
import { useIsFullAdmin } from "@/app/admin/_components/AdminSessionContext";

export default function AdminSubscriptionsPage() {
  const isFullAdmin = useIsFullAdmin();
  const router = useRouter();

  useEffect(() => {
    // Billing/Subscription Management is Admin-only per the spec — the
    // sidebar already hides this link for Support Admins, guard the route too.
    if (!isFullAdmin) router.push('/admin/dashboard');
  }, [isFullAdmin, router]);

  if (!isFullAdmin) return null;
  return <SubscriptionsPanel />;
}
