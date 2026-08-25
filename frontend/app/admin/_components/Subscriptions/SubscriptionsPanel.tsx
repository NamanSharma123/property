"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Search, DollarSign, Ban, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import adminApi, { AdminSubscription, SubscriptionPlan } from "@/lib/adminApi";
import { PageHeader } from "@/app/admin/_components/PageHeader";
import PlanCard from "./PlanCard";
import RecordPaymentDialog from "./RecordPaymentDialog";

const statusTone: Record<string, string> = {
  active: "bg-green-50 text-green-700 border-green-200",
  cancelled: "bg-gray-50 text-gray-500 border-gray-200",
  expired: "bg-red-50 text-red-600 border-red-200",
};

const paymentTone: Record<string, string> = {
  paid: "bg-green-50 text-green-700 border-green-200",
  pending: "bg-amber-50 text-amber-600 border-amber-200",
  failed: "bg-red-50 text-red-600 border-red-200",
};

export default function SubscriptionsPanel() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [rows, setRows] = useState<AdminSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [recordingFor, setRecordingFor] = useState<string | null>(null);

  const loadPlans = useCallback(async () => {
    const res = await adminApi.subscriptions.plans.getAll();
    if (res.success && res.data) setPlans(res.data.plans);
  }, []);

  const loadSubs = useCallback(async () => {
    setLoading(true);
    const res = await adminApi.subscriptions.getAll({
      search: search || undefined, planId: planFilter === "all" ? undefined : planFilter, page, limit: 20,
    });
    if (res.success && res.data) {
      setRows(res.data.subscriptions);
      setPages(res.data.pagination.pages || 1);
      setTotal(res.data.pagination.total);
    } else {
      toast.error(res.error || "Failed to load subscriptions");
    }
    setLoading(false);
  }, [search, planFilter, page]);

  useEffect(() => { loadPlans(); }, [loadPlans]);
  useEffect(() => { const h = setTimeout(() => setPage(1), 350); return () => clearTimeout(h); }, [search, planFilter]);
  useEffect(() => { loadSubs(); }, [loadSubs]);

  const changePlan = async (sub: AdminSubscription, planId: string) => {
    const res = await adminApi.subscriptions.changePlan(sub.id, planId);
    if (res.success) { toast.success(res.message || "Updated"); loadSubs(); }
    else toast.error(res.error || "Failed to change plan");
  };

  const cancel = async (sub: AdminSubscription) => {
    const res = await adminApi.subscriptions.cancel(sub.id);
    if (res.success) { toast.success("Subscription cancelled"); loadSubs(); }
    else toast.error(res.error || "Failed to cancel");
  };

  return (
    <div>
      <PageHeader eyebrow="Admin" title="Subscriptions" description="Billing plans and per-user subscription status." />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {plans.map((p) => <PlanCard key={p.id} plan={p} onSaved={loadPlans} />)}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search user…" className="pl-9" />
        </div>
        <Select value={planFilter} onValueChange={setPlanFilter}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Plan" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All plans</SelectItem>
            {plans.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-10 text-gray-400">Loading…</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-10 text-gray-400">No subscriptions match.</TableCell></TableRow>
              ) : rows.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="text-sm text-gray-700">{s.user_name}</div>
                    <div className="text-xs text-gray-400">{s.user_email}</div>
                  </TableCell>
                  <TableCell>
                    <Select value={s.plan_id} onValueChange={(v) => changePlan(s, v)}>
                      <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {plans.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell><Badge variant="outline" className={statusTone[s.status] || ""}>{s.status}</Badge></TableCell>
                  <TableCell><Badge variant="outline" className={paymentTone[s.payment_status] || ""}>{s.payment_status}</Badge></TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setRecordingFor(s.id)} className="p-1.5 rounded-md text-gray-400 hover:text-primary hover:bg-gray-50" title="Record manual payment">
                        <DollarSign size={16} />
                      </button>
                      {s.status !== "cancelled" && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50" title="Cancel subscription"><Ban size={16} /></button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Cancel this subscription?</AlertDialogTitle>
                              <AlertDialogDescription>The user keeps their data but the plan is marked cancelled.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Never mind</AlertDialogCancel>
                              <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => cancel(s)}>Cancel subscription</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
          <span>{total} subscription{total === 1 ? "" : "s"}</span>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="p-1.5 rounded-md border border-gray-200 disabled:opacity-40 hover:bg-gray-50"><ChevronLeft size={14} /></button>
            <span className="tabular-nums text-xs">{page} / {pages}</span>
            <button disabled={page >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))} className="p-1.5 rounded-md border border-gray-200 disabled:opacity-40 hover:bg-gray-50"><ChevronRight size={14} /></button>
          </div>
        </div>
      </div>

      <RecordPaymentDialog subscriptionId={recordingFor} open={!!recordingFor} onOpenChange={(o) => !o && setRecordingFor(null)} onSaved={loadSubs} />
    </div>
  );
}
