"use client";

import { use } from "react";
import TicketDetail from "@/app/admin/_components/Support/TicketDetail";

export default function AdminTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <TicketDetail ticketId={id} />;
}
