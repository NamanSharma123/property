"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import adminApi, { SubscriptionPlan } from "@/lib/adminApi";

export default function PlanCard({ plan, onSaved }: { plan: SubscriptionPlan; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState(plan.monthly_price);
  const [usersAllowed, setUsersAllowed] = useState(String(plan.users_allowed));
  const [ocrLimit, setOcrLimit] = useState(plan.ocr_limit != null ? String(plan.ocr_limit) : "");
  const [isActive, setIsActive] = useState(plan.is_active);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    const res = await adminApi.subscriptions.plans.update(plan.id, {
      monthlyPrice: Number(price),
      usersAllowed: Number(usersAllowed),
      ocrLimit: ocrLimit === "" ? null : Number(ocrLimit),
      isActive,
    });
    setBusy(false);
    if (res.success) {
      toast.success("Plan updated");
      setOpen(false);
      onSaved();
    } else {
      toast.error(res.error || "Update failed");
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
      <div className="flex items-start justify-between mb-1">
        <h3 className="text-base font-semibold text-gray-900">{plan.name}</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <button className="p-1 text-gray-400 hover:text-primary"><Pencil size={14} /></button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit {plan.name}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Monthly price ($)</label>
                <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Users allowed</label>
                <Input type="number" value={usersAllowed} onChange={(e) => setUsersAllowed(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">OCR limit (blank = unlimited)</label>
                <Input type="number" value={ocrLimit} onChange={(e) => setOcrLimit(e.target.value)} />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <Switch checked={isActive} onCheckedChange={setIsActive} /> Active
              </label>
            </div>
            <DialogFooter>
              <button disabled={busy} onClick={save} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40">
                {busy ? "Saving…" : "Save changes"}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <p className="text-xs text-gray-400 mb-3">{plan.description}</p>
      <div className="text-2xl font-semibold text-gray-900">
        ${Number(plan.monthly_price).toFixed(0)}<span className="text-sm font-normal text-gray-400">/mo</span>
      </div>
      <div className="text-xs text-gray-500 mt-2 space-y-0.5">
        <div>{plan.users_allowed >= 999999 ? "Unlimited" : plan.users_allowed} user{plan.users_allowed === 1 ? "" : "s"}</div>
        <div>{plan.ocr_limit == null ? "Unlimited" : plan.ocr_limit} OCR docs/mo</div>
      </div>
    </div>
  );
}
