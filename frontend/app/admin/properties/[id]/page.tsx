"use client";

import { use } from "react";
import PropertyDetail from "@/app/admin/_components/Properties/PropertyDetail";
import { useIsFullAdmin } from "@/app/admin/_components/AdminSessionContext";

export default function AdminPropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const isFullAdmin = useIsFullAdmin();
  return <PropertyDetail propertyId={id} isFullAdmin={isFullAdmin} />;
}
