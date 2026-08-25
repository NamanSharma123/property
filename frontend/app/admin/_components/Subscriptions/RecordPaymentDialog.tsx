"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import adminApi from "@/lib/adminApi";

export default function RecordPaymentDialog({ subscriptionId, open, onOpenChange, onSaved }: {
  subscriptionId: string | null; open: boolean; onOpenChange: (o: boolean) => void; onSaved: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!subscriptionId || !amount) { toast.error("Amount is required"); return; }
    setBusy(true);
    const res = await adminApi.subscriptions.recordPayment(subscriptionId, { amount, notes: notes || undefined });
    setBusy(false);
    if (res.success) {
      toast.success("Payment recorded");
      setAmount(""); setNotes("");
      onOpenChange(false);
      onSaved();
    } else {
      toast.error(res.error || "Could not record payment");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Record manual payment</DialogTitle></DialogHeader>
        <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" />
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" />
        <DialogFooter>
          <button disabled={busy || !amount} onClick={save} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40">
            {busy ? "Saving…" : "Record payment"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
