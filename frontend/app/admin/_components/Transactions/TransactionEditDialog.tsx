"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import adminApi, { AdminTransaction } from "@/lib/adminApi";

export default function TransactionEditDialog({
  transaction, open, onOpenChange, onSaved,
}: {
  transaction: AdminTransaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [description, setDescription] = useState(transaction?.description || "");
  const [amount, setAmount] = useState(transaction?.amount || "");
  const [status, setStatus] = useState(transaction?.status || "pending");
  const [categoryName, setCategoryName] = useState(transaction?.category_name || "");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!transaction) return;
    setBusy(true);
    const res = await adminApi.transactions.update(transaction.id, {
      description, amount, status, categoryName,
    });
    setBusy(false);
    if (res.success) {
      toast.success("Transaction updated");
      onOpenChange(false);
      onSaved();
    } else {
      toast.error(res.error || "Update failed");
    }
  };

  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit transaction</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Description</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Amount</label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Category</label>
              <Input value={categoryName} onChange={(e) => setCategoryName(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <button disabled={busy} onClick={save} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40">
            {busy ? "Saving…" : "Save changes"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
