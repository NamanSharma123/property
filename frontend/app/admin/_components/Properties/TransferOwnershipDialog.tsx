"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import adminApi, { AdminUser } from "@/lib/adminApi";

export default function TransferOwnershipDialog({
  trigger, currentOwnerId, onTransferred,
}: {
  trigger: React.ReactNode;
  currentOwnerId: string;
  onTransferred: (newOwnerId: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<AdminUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [busy, setBusy] = useState(false);

  const runSearch = async () => {
    if (!search.trim()) return;
    setSearching(true);
    const res = await adminApi.users.getAll({ search, limit: 8 });
    setSearching(false);
    if (res.success && res.data) {
      setResults(res.data.users.filter((u) => u.id !== currentOwnerId));
    } else {
      toast.error(res.error || "Search failed");
    }
  };

  const confirm = async () => {
    if (!selected) return;
    setBusy(true);
    await onTransferred(selected.id);
    setBusy(false);
    setOpen(false);
    setSelected(null);
    setResults([]);
    setSearch("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transfer ownership</DialogTitle>
          <DialogDescription>
            Moves this property — and every transaction, document, and loan tied to it — to a new owner.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setSelected(null); }}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
              placeholder="Search by name or email…"
              className="pl-9"
            />
          </div>
          <button onClick={runSearch} disabled={searching} className="px-3 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50">
            {searching ? "…" : "Find"}
          </button>
        </div>

        {results.length > 0 && (
          <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-48 overflow-y-auto">
            {results.map((u) => (
              <button
                key={u.id}
                onClick={() => setSelected(u)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${selected?.id === u.id ? "bg-[hsl(var(--sidebar-active-bg))]" : ""}`}
              >
                <div className="font-medium text-gray-900">{u.name}</div>
                <div className="text-xs text-gray-400">{u.email}</div>
              </button>
            ))}
          </div>
        )}

        <DialogFooter>
          <button
            disabled={!selected || busy}
            onClick={confirm}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40"
          >
            {busy ? "Transferring…" : selected ? `Transfer to ${selected.name}` : "Select a user"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
