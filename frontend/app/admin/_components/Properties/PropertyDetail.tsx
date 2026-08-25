"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2, ArrowRightLeft, Merge } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import adminApi, { AdminProperty, AdminTransaction, AdminDocument } from "@/lib/adminApi";
import TransferOwnershipDialog from "./TransferOwnershipDialog";

const money = (n: number | string | null) => n == null ? "—" : `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-gray-400">{label}</div>
      <div className="text-sm text-gray-800 mt-0.5">{value}</div>
    </div>
  );
}

function MergeDialog({ propertyId, onMerged }: { propertyId: string; onMerged: () => void }) {
  const [open, setOpen] = useState(false);
  const [duplicateId, setDuplicateId] = useState("");
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    if (!duplicateId.trim()) return;
    setBusy(true);
    const res = await adminApi.properties.merge(propertyId, duplicateId.trim());
    setBusy(false);
    if (res.success) {
      toast.success("Properties merged");
      setOpen(false);
      setDuplicateId("");
      onMerged();
    } else {
      toast.error(res.error || "Merge failed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">
          <Merge size={14} /> Merge duplicate
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Merge a duplicate property</DialogTitle>
          <DialogDescription>
            Moves every transaction, document, loan, and depreciation schedule off the duplicate onto
            this property, then permanently deletes the duplicate. Paste the duplicate property&apos;s ID.
          </DialogDescription>
        </DialogHeader>
        <Input value={duplicateId} onChange={(e) => setDuplicateId(e.target.value)} placeholder="Duplicate property ID" />
        <DialogFooter>
          <button disabled={!duplicateId.trim() || busy} onClick={confirm} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40">
            {busy ? "Merging…" : "Merge"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function PropertyDetail({ propertyId, isFullAdmin }: { propertyId: string; isFullAdmin: boolean }) {
  const router = useRouter();
  const [property, setProperty] = useState<AdminProperty | null>(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [documents, setDocuments] = useState<AdminDocument[]>([]);

  const load = async () => {
    const res = await adminApi.properties.getOne(propertyId);
    if (res.success && res.data) {
      setProperty(res.data.property);
    } else {
      toast.error(res.error || "Property not found");
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [propertyId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    adminApi.transactions.getAll({ propertyId, limit: 25 }).then((res) => {
      if (res.success && res.data) setTransactions(res.data.transactions);
    });
    adminApi.documents.getAll({ propertyId, limit: 25 }).then((res) => {
      if (res.success && res.data) setDocuments(res.data.documents);
    });
  }, [propertyId]);

  const deleteProperty = async () => {
    const res = await adminApi.properties.remove(propertyId);
    if (res.success) {
      toast.success("Property deleted");
      router.push("/admin/properties");
    } else {
      toast.error(res.error || "Could not delete property");
    }
  };

  if (loading) return <div className="py-16 text-center text-gray-400 text-sm">Loading…</div>;
  if (!property) return <div className="py-16 text-center text-gray-400 text-sm">Property not found.</div>;

  return (
    <div>
      <Link href="/admin/properties" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary mb-4">
        <ArrowLeft size={14} /> Back to properties
      </Link>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 mb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-900 truncate">{property.name}</h2>
              <Badge variant="outline">{property.status}</Badge>
            </div>
            <div className="text-sm text-gray-500">{property.full_address}</div>
            <div className="text-xs text-gray-400 mt-1">
              Owner: <Link href={`/admin/users/${property.owner_id}`} className="text-primary hover:underline">{property.owner_name}</Link>
            </div>
          </div>

          {isFullAdmin && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <TransferOwnershipDialog
                currentOwnerId={property.owner_id}
                onTransferred={async (newOwnerId) => {
                  const res = await adminApi.properties.transferOwnership(propertyId, newOwnerId);
                  if (res.success) { toast.success(res.message || "Transferred"); load(); }
                  else toast.error(res.error || "Transfer failed");
                }}
                trigger={
                  <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">
                    <ArrowRightLeft size={14} /> Transfer
                  </button>
                }
              />
              <MergeDialog propertyId={propertyId} onMerged={load} />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 text-sm font-medium text-red-600 hover:bg-red-50">
                    <Trash2 size={14} /> Delete
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete {property.name}?</AlertDialogTitle>
                    <AlertDialogDescription>This permanently deletes the property and everything tied to it. This cannot be undone.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={deleteProperty}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-5 border-t border-gray-100">
          <Field label="Current value" value={money(property.current_value)} />
          <Field label="Loan balance" value={money(property.loanBalance)} />
          <Field label="Income this month" value={<span className="text-green-700">{money(property.monthlyIncome)}</span>} />
          <Field label="Expense this month" value={<span className="text-red-600">{money(property.monthlyExpense)}</span>} />
        </div>
      </div>

      <Tabs defaultValue="summary">
        <TabsList className="mb-4 flex-wrap h-auto">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="transactions">Transactions ({property.transactionsCount ?? 0})</TabsTrigger>
          <TabsTrigger value="documents">Documents ({property.documentsCount ?? 0})</TabsTrigger>
          <TabsTrigger value="loans">Loans ({property.loans?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
          <TabsContent value="summary" className="mt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="Type" value={<span className="capitalize">{property.type}</span>} />
              <Field label="Purchase price" value={money(property.purchase_price)} />
              <Field label="Purchase date" value={property.purchase_date || "—"} />
              <Field label="Net cash flow this month" value={
                <span className={property.netCashFlow < 0 ? "text-red-600" : "text-green-700"}>{money(property.netCashFlow)}</span>
              } />
              <Field label="Depreciation schedules" value={property.depreciationSchedulesCount ?? 0} />
            </div>
          </TabsContent>

          <TabsContent value="transactions" className="mt-0">
            {transactions.length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center">No transactions for this property.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead>Owner</TableHead><TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-sm text-gray-600 whitespace-nowrap">{t.date}</TableCell>
                      <TableCell className="text-sm text-gray-900">{t.description}</TableCell>
                      <TableCell className="text-sm text-gray-500">{t.owner_name}</TableCell>
                      <TableCell className={`text-right text-sm font-medium tabular-nums ${t.type === "expense" ? "text-red-600" : "text-green-700"}`}>
                        {t.signedAmount >= 0 ? "+" : "−"}${Math.abs(t.signedAmount).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          <TabsContent value="documents" className="mt-0">
            {documents.length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center">No documents for this property.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow><TableHead>File</TableHead><TableHead>Status</TableHead><TableHead>Uploaded</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="text-sm text-gray-900">{d.file_name}</TableCell>
                      <TableCell><Badge variant="outline">{d.status}</Badge></TableCell>
                      <TableCell className="text-xs text-gray-500">{new Date(d.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          <TabsContent value="loans" className="mt-0">
            {(!property.loans || property.loans.length === 0) ? (
              <p className="text-sm text-gray-400 py-6 text-center">No loans linked to this property.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Lender</TableHead><TableHead className="text-right">Balance</TableHead><TableHead className="text-right">Rate</TableHead><TableHead>Status</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {property.loans.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-sm text-gray-900">{l.lender}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{money(l.current_balance)}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{l.interest_rate ? `${l.interest_rate}%` : "—"}</TableCell>
                      <TableCell><Badge variant="outline">{l.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          <TabsContent value="activity" className="mt-0">
            {(!property.activity || property.activity.length === 0) ? (
              <p className="text-sm text-gray-400 py-6 text-center">No recorded activity yet.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {property.activity.map((a) => (
                  <div key={a.id} className="py-2.5 text-sm">
                    <span className="text-gray-800">{a.action.replace(/_/g, " ")}</span>
                    <span className="text-gray-400 ml-2 text-xs">{new Date(a.created_at).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
