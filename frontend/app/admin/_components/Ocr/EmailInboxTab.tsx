"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Search, Link2, FileInput, ChevronLeft, ChevronRight, PlayCircle, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import adminApi, { EmailMessage } from "@/lib/adminApi";

const statusTone: Record<string, string> = {
  received: "bg-gray-50 text-gray-500 border-gray-200",
  processing: "bg-amber-50 text-amber-600 border-amber-200",
  processed: "bg-green-50 text-green-700 border-green-200",
  needs_review: "bg-red-50 text-red-600 border-red-200",
  failed: "bg-red-50 text-red-600 border-red-200",
};

function MapDialog({ message, open, onOpenChange, onMapped }: { message: EmailMessage | null; open: boolean; onOpenChange: (o: boolean) => void; onMapped: () => void }) {
  const [userId, setUserId] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!message) return;
    if (!userId && !propertyId) { toast.error("Enter a user ID or property ID"); return; }
    setBusy(true);
    const res = await adminApi.emailInbox.map(message.id, { userId: userId || undefined, propertyId: propertyId || undefined });
    setBusy(false);
    if (res.success) {
      toast.success("Mapped");
      onOpenChange(false);
      setUserId(""); setPropertyId("");
      onMapped();
    } else {
      toast.error(res.error || "Mapping failed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Map this email</DialogTitle></DialogHeader>
        <p className="text-xs text-gray-500">The receiver address didn&apos;t match a user&apos;s inbound OCR email — assign it manually.</p>
        <Input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="User ID" />
        <Input value={propertyId} onChange={(e) => setPropertyId(e.target.value)} placeholder="Property ID (optional)" />
        <DialogFooter>
          <button disabled={busy} onClick={save} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40">
            {busy ? "Saving…" : "Map"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function EmailInboxTab({ isFullAdmin }: { isFullAdmin: boolean }) {
  const [rows, setRows] = useState<EmailMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [mapping, setMapping] = useState<EmailMessage | null>(null);
  const [runningJob, setRunningJob] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await adminApi.emailInbox.getAll({ search: search || undefined, status: status === "all" ? undefined : status, page, limit: 20 });
    if (res.success && res.data) {
      setRows(res.data.emailMessages);
      setPages(res.data.pagination.pages || 1);
      setTotal(res.data.pagination.total);
    } else {
      toast.error(res.error || "Failed to load email inbox");
    }
    setLoading(false);
  }, [search, status, page]);

  useEffect(() => { const h = setTimeout(() => setPage(1), 350); return () => clearTimeout(h); }, [search, status]);
  useEffect(() => { load(); }, [load]);

  const convert = async (m: EmailMessage) => {
    const res = await adminApi.emailInbox.convert(m.id);
    if (res.success) { toast.success(res.message || "Converted"); load(); }
    else toast.error(res.error || "Convert failed");
  };

  const runJob = async () => {
    setRunningJob(true);
    const res = await adminApi.emailInbox.runJob();
    setRunningJob(false);
    if (res.success) {
      toast.success(res.message || "OCR job run complete");
      load();
    } else {
      toast.error(res.error || "OCR job failed to run");
    }
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-3">
        <p className="text-xs text-gray-400">
          Populated by the SES inbound-email webhook once it&apos;s wired to a real domain — empty until then.
          The OCR job runs hourly in the background; use &quot;Run OCR job now&quot; to process outstanding emails immediately.
        </p>
        {isFullAdmin && (
          <button
            onClick={runJob}
            disabled={runningJob}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 whitespace-nowrap"
          >
            {runningJob ? <Loader2 size={14} className="animate-spin" /> : <PlayCircle size={14} />}
            {runningJob ? "Running…" : "Run OCR job now"}
          </button>
        )}
      </div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search sender, subject…" className="pl-9" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="received">Received</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="needs_review">Needs review</SelectItem>
            <SelectItem value="processed">Processed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>From</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Mapped user</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Received</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-10 text-gray-400">Loading…</TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-10 text-gray-400">No inbound emails yet.</TableCell></TableRow>
            ) : rows.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="text-sm text-gray-900">{m.sender}</TableCell>
                <TableCell className="text-sm text-gray-500">{m.subject || "—"}</TableCell>
                <TableCell className="text-sm text-gray-500">{m.user_name || "—"}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={statusTone[m.status] || ""} title={m.processing_log || undefined}>
                    {m.status.replace(/_/g, " ")}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-gray-500 whitespace-nowrap">{new Date(m.received_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => setMapping(m)} className="p-1.5 rounded-md text-gray-400 hover:text-primary hover:bg-gray-50" title="Map to user/property"><Link2 size={16} /></button>
                    {m.user_id && m.attachment_url && !m.document_id && (
                      <button onClick={() => convert(m)} className="p-1.5 rounded-md text-gray-400 hover:text-primary hover:bg-gray-50" title="Convert to document"><FileInput size={16} /></button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between px-1 py-3 text-sm text-gray-500">
        <span>{total} message{total === 1 ? "" : "s"}</span>
        <div className="flex items-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="p-1.5 rounded-md border border-gray-200 disabled:opacity-40 hover:bg-gray-50"><ChevronLeft size={14} /></button>
          <span className="tabular-nums text-xs">{page} / {pages}</span>
          <button disabled={page >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))} className="p-1.5 rounded-md border border-gray-200 disabled:opacity-40 hover:bg-gray-50"><ChevronRight size={14} /></button>
        </div>
      </div>

      <MapDialog message={mapping} open={!!mapping} onOpenChange={(o) => !o && setMapping(null)} onMapped={load} />
    </div>
  );
}
