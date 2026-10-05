"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, X, Pencil, RotateCcw, History } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import adminApi, { AdminProperty, OcrDocumentDetail } from "@/lib/adminApi";

const formatAmount = (amount: string, itemType: string) => {
  const n = parseFloat(amount);
  const sign = itemType === "income" ? "+" : "−";
  return `${sign}$${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function ReviewDocumentDialog({
  documentId, open, onOpenChange, onDecided,
}: {
  documentId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDecided: () => void;
}) {
  const [doc, setDoc] = useState<OcrDocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [reprocessing, setReprocessing] = useState(false);
  const [createTx, setCreateTx] = useState(false);
  const [txAmount, setTxAmount] = useState("");
  const [txDate, setTxDate] = useState("");
  const [txDescription, setTxDescription] = useState("");
  const [ownerProperties, setOwnerProperties] = useState<AdminProperty[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");

  const unconvertedLineItems = (doc?.lineItems || []).filter((li) => !li.is_converted);

  useEffect(() => {
    if (!documentId || !open) return;
    setLoading(true);
    adminApi.ocr.getDocument(documentId).then((res) => {
      if (res.success && res.data) {
        setDoc(res.data.document);
        if (res.data.document.owner_id) {
          adminApi.properties.getAll({ userId: res.data.document.owner_id, limit: 100 }).then((pres) => {
            if (pres.success && pres.data) {
              setOwnerProperties(pres.data.properties);
              setSelectedPropertyId(res.data!.document.property_id || (pres.data.properties.length === 1 ? pres.data.properties[0].id : ""));
            }
          });
        }
      } else {
        toast.error(res.error || "Failed to load document");
      }
      setLoading(false);
    });
    adminApi.documents.getViewUrl(documentId).then((res) => {
      if (res.success && res.data) setPreviewUrl(res.data.url);
    });
  }, [documentId, open]);

  const saveField = async (fieldId: string) => {
    const res = await adminApi.ocr.correctField(fieldId, editValue);
    if (res.success) {
      toast.success("Field corrected");
      setEditingField(null);
      if (documentId) {
        const refreshed = await adminApi.ocr.getDocument(documentId);
        if (refreshed.success && refreshed.data) setDoc(refreshed.data.document);
      }
    } else {
      toast.error(res.error || "Could not save correction");
    }
  };

  const approveLineItems = async () => {
    if (!documentId) return;
    setBusy(true);
    const res = await adminApi.ocr.approveLineItems(documentId, selectedPropertyId || undefined);
    setBusy(false);
    if (res.success) {
      toast.success(res.message || `Created ${res.data?.created ?? 0} transaction(s)`);
      onOpenChange(false);
      onDecided();
    } else {
      toast.error(res.error || "Could not create transactions from line items");
    }
  };

  const approve = async () => {
    if (!documentId) return;
    if (createTx && !txAmount) { toast.error("Amount is required to create a transaction"); return; }
    if (createTx && !doc?.property_id && !selectedPropertyId) { toast.error("Select a property to create the transaction under"); return; }

    setBusy(true);
    const res = await adminApi.ocr.approve(documentId, createTx ? {
      createTransaction: true, propertyId: selectedPropertyId || undefined,
      amount: txAmount, date: txDate || undefined, description: txDescription || undefined,
    } : {});
    setBusy(false);
    if (res.success) {
      toast.success(res.message || "Document approved");
      onOpenChange(false);
      onDecided();
    } else {
      toast.error(res.error || "Approve failed");
    }
  };

  const reject = async () => {
    if (!documentId) return;
    setBusy(true);
    const res = await adminApi.ocr.reject(documentId, "Rejected in admin review");
    setBusy(false);
    if (res.success) {
      toast.success("Document rejected");
      onOpenChange(false);
      onDecided();
    } else {
      toast.error(res.error || "Reject failed");
    }
  };

  const reprocess = async () => {
    if (!documentId) return;
    setReprocessing(true);
    const res = await adminApi.ocr.reprocess(documentId, "Admin requested re-OCR");
    setReprocessing(false);
    if (res.success) {
      toast.success(res.message || "Re-OCR complete — review the new result");
      const refreshed = await adminApi.ocr.getDocument(documentId);
      if (refreshed.success && refreshed.data) setDoc(refreshed.data.document);
    } else {
      toast.error(res.error || "Re-OCR failed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Review document</DialogTitle></DialogHeader>

        {loading || !doc ? (
          <div className="py-16 text-center text-gray-400 text-sm">Loading…</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-gray-900">Source document</h4>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{doc.file_name}</Badge>
                  {previewUrl && (
                    <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline whitespace-nowrap">
                      Open in new tab ↗
                    </a>
                  )}
                </div>
              </div>
              {previewUrl ? (
                // The browser's native PDF/image viewer — handles every page
                // of a multi-page PDF (scroll/paginate inside the frame)
                // without pulling in a separate PDF.js dependency, same
                // pattern DepreciationScheduleModal already uses elsewhere.
                <iframe src={previewUrl} title={doc.file_name} className="w-full h-[32rem] border border-gray-200 rounded-xl bg-gray-50" />
              ) : (
                <div className="h-[32rem] border border-dashed border-gray-200 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 text-sm">
                  No preview available
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-gray-900">Extracted line items</h4>
                {doc.ocr_confidence != null && (
                  <Badge variant="outline" className={doc.ocr_confidence >= 80 ? "bg-green-50 text-green-700 border-green-200" : "bg-amber-50 text-amber-600 border-amber-200"}>
                    {Math.round(doc.ocr_confidence)}% confidence
                  </Badge>
                )}
              </div>

              {doc.lineItems.length > 0 ? (
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {doc.lineItems.map((li) => (
                    <div key={li.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-gray-100">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-gray-800 truncate">{li.description}</div>
                        <div className="text-xs text-gray-400 truncate">
                          {li.category || "uncategorized"}{li.property_name ? ` · ${li.property_name}` : ""}
                          {li.is_converted && <span className="text-green-600"> · converted</span>}
                        </div>
                      </div>
                      <div className={`text-sm font-medium tabular-nums flex-shrink-0 ${li.item_type === "expense" ? "text-red-600" : "text-green-700"}`}>
                        {formatAmount(li.amount, li.item_type)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : doc.extractedData.length === 0 ? (
                <p className="text-sm text-gray-400 py-6 text-center">No extracted fields recorded for this document.</p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {doc.extractedData.map((f) => (
                    <div key={f.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-gray-100">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs text-gray-400">{f.field_name}</div>
                        {editingField === f.id ? (
                          <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} className="h-7 mt-1 text-sm" autoFocus />
                        ) : (
                          <div className="text-sm text-gray-800 truncate">{f.corrected_value || f.field_value || "—"}</div>
                        )}
                      </div>
                      {editingField === f.id ? (
                        <button onClick={() => saveField(f.id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-md flex-shrink-0"><Check size={14} /></button>
                      ) : (
                        <button onClick={() => { setEditingField(f.id); setEditValue(f.corrected_value || f.field_value || ""); }} className="p-1.5 text-gray-400 hover:text-primary hover:bg-gray-50 rounded-md flex-shrink-0">
                          <Pencil size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {ownerProperties.length > 0 && (
                <div className="mt-3">
                  <label className="text-xs text-gray-500 mb-1 block">
                    Property {unconvertedLineItems.some((li) => !li.property_name) ? "(needed to resolve some line items)" : ""}
                  </label>
                  <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select property…" /></SelectTrigger>
                    <SelectContent>
                      {ownerProperties.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {unconvertedLineItems.length > 0 && (
                <div className="mt-3 border-t border-gray-100 pt-3">
                  <button
                    disabled={busy}
                    onClick={approveLineItems}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
                  >
                    <Check size={14} /> Approve & create {unconvertedLineItems.length} transaction{unconvertedLineItems.length === 1 ? "" : "s"}
                  </button>
                </div>
              )}

              <div className="mt-3 border-t border-gray-100 pt-3">
                <label className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                  <Checkbox checked={createTx} onCheckedChange={(c) => setCreateTx(!!c)} />
                  Create a transaction from this document
                </label>
                {createTx && (
                  <div className="grid grid-cols-2 gap-2 mb-1">
                    <Input placeholder="Amount" type="number" value={txAmount} onChange={(e) => setTxAmount(e.target.value)} className="h-8 text-sm" />
                    <Input placeholder="Date (YYYY-MM-DD)" value={txDate} onChange={(e) => setTxDate(e.target.value)} className="h-8 text-sm" />
                    <Input placeholder="Description" value={txDescription} onChange={(e) => setTxDescription(e.target.value)} className="h-8 text-sm col-span-2" />
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-2">
                <button disabled={busy} onClick={approve} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
                  <Check size={14} /> Approve{createTx && " & create"}
                </button>
                <button disabled={busy} onClick={reject} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                  <X size={14} /> Reject
                </button>
                <button
                  disabled={reprocessing}
                  onClick={reprocess}
                  title="Run OCR again on this file — creates a new attempt, doesn't touch the current one"
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  <RotateCcw size={14} className={reprocessing ? "animate-spin" : ""} /> Re-OCR
                </button>
              </div>

              {doc.ocrJobs && doc.ocrJobs.length > 0 && (
                <div className="mt-3 border-t border-gray-100 pt-3">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1.5">
                    <History size={13} /> Attempt history
                  </div>
                  <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                    {doc.ocrJobs.map((job) => (
                      <div key={job.id} className="flex items-center justify-between text-xs text-gray-500 px-2 py-1 rounded-md bg-gray-50">
                        <span>#{job.attempt_number} · {job.provider || "—"}</span>
                        <span className="flex items-center gap-2">
                          {job.confidence != null && <span>{Math.round(job.confidence)}%</span>}
                          <Badge
                            variant="outline"
                            className={
                              job.status === "completed" ? "bg-green-50 text-green-700 border-green-200"
                                : job.status === "failed" ? "bg-red-50 text-red-600 border-red-200"
                                : "bg-gray-50 text-gray-500 border-gray-200"
                            }
                          >
                            {job.status}
                          </Badge>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
