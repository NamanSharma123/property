"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import adminApi, { AdminLoan } from "@/lib/adminApi";

export default function LoanFormDialog({
  loan, open, onOpenChange, onSaved,
}: {
  loan: AdminLoan | null; // null = create
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [propertyId, setPropertyId] = useState(loan?.property_id || "");
  const [lender, setLender] = useState(loan?.lender || "");
  const [principal, setPrincipal] = useState(loan?.principal || "");
  const [currentBalance, setCurrentBalance] = useState(loan?.current_balance || "");
  const [interestRate, setInterestRate] = useState(loan?.interest_rate || "");
  const [monthlyRepayment, setMonthlyRepayment] = useState(loan?.monthly_repayment || "");
  const [status, setStatus] = useState(loan?.status || "active");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!loan && !propertyId.trim()) { toast.error("Property ID is required"); return; }
    if (!lender.trim()) { toast.error("Lender is required"); return; }
    if (!principal) { toast.error("Principal is required"); return; }

    setBusy(true);
    const payload = {
      propertyId, lender, principal, currentBalance: currentBalance || principal,
      interestRate: interestRate || undefined, monthlyRepayment: monthlyRepayment || undefined, status,
    };
    const res = loan ? await adminApi.loans.update(loan.id, payload) : await adminApi.loans.create(payload);
    setBusy(false);
    if (res.success) {
      toast.success(loan ? "Loan updated" : "Loan created");
      onOpenChange(false);
      onSaved();
    } else {
      toast.error(res.error || "Save failed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{loan ? "Edit loan" : "Add loan"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {!loan && (
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Property ID</label>
              <Input value={propertyId} onChange={(e) => setPropertyId(e.target.value)} placeholder="Property UUID" />
            </div>
          )}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Lender</label>
            <Input value={lender} onChange={(e) => setLender(e.target.value)} placeholder="e.g. Westpac" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Principal</label>
              <Input type="number" value={principal} onChange={(e) => setPrincipal(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Current balance</label>
              <Input type="number" value={currentBalance} onChange={(e) => setCurrentBalance(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Interest rate (%)</label>
              <Input type="number" step="0.01" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Monthly repayment</label>
              <Input type="number" value={monthlyRepayment} onChange={(e) => setMonthlyRepayment(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Status</label>
            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="refinanced">Refinanced</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <button disabled={busy} onClick={save} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40">
            {busy ? "Saving…" : loan ? "Save changes" : "Create loan"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
