"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Lock, MessageSquare, MessageCircle, CalendarClock, CheckCircle2, RotateCcw, UserCheck, UserX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import adminApi, { Ticket } from "@/lib/adminApi";
import { useAdminSession } from "@/app/admin/_components/AdminSessionContext";

const statusTone: Record<string, string> = {
  open: "bg-amber-50 text-amber-600 border-amber-200",
  in_progress: "bg-[hsl(var(--sidebar-active-bg))] text-primary border-transparent",
  resolved: "bg-green-50 text-green-700 border-green-200",
  closed: "bg-gray-50 text-gray-500 border-gray-200",
};

export default function TicketDetail({ ticketId }: { ticketId: string }) {
  const session = useAdminSession();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [noteText, setNoteText] = useState("");
  const [mode, setMode] = useState<"reply" | "note">("reply");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const res = await adminApi.support.getOne(ticketId);
    if (res.success && res.data) setTicket(res.data.ticket);
    else toast.error(res.error || "Ticket not found");
    setLoading(false);
  };

  useEffect(() => { load(); }, [ticketId]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = async () => {
    setBusy(true);
    const res = mode === "reply"
      ? await adminApi.support.reply(ticketId, replyText)
      : await adminApi.support.addInternalNote(ticketId, noteText);
    setBusy(false);
    if (res.success) {
      toast.success(mode === "reply" ? "Reply sent" : "Note added");
      setReplyText(""); setNoteText("");
      load();
    } else {
      toast.error(res.error || "Failed to send");
    }
  };

  const setStatus = async (status: Ticket["status"]) => {
    const res = await adminApi.support.setStatus(ticketId, status);
    if (res.success) { toast.success(res.message || "Updated"); load(); }
    else toast.error(res.error || "Failed to update status");
  };

  const toggleAssignToMe = async () => {
    const alreadyMine = ticket?.assigned_admin_id === session.id;
    const res = await adminApi.support.assign(ticketId, alreadyMine ? null : session.id);
    if (res.success) { toast.success(res.message || "Updated"); load(); }
    else toast.error(res.error || "Failed to assign");
  };

  if (loading) return <div className="py-16 text-center text-gray-400 text-sm">Loading…</div>;
  if (!ticket) return <div className="py-16 text-center text-gray-400 text-sm">Ticket not found.</div>;

  return (
    <div>
      <Link href="/admin/support" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary mb-4">
        <ArrowLeft size={14} /> Back to tickets
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{ticket.subject}</h2>
              <div className="text-xs text-gray-400">{ticket.user_name} · {ticket.user_email}</div>
            </div>
            <Badge variant="outline" className={statusTone[ticket.status] || ""}>{ticket.status.replace("_", " ")}</Badge>
          </div>

          <div className="space-y-3 mb-5 max-h-96 overflow-y-auto pr-1">
            {ticket.messages?.map((m) => (
              <div key={m.id} className={`p-3 rounded-lg text-sm ${m.is_internal_note ? "bg-amber-50 border border-amber-100" : "bg-gray-50"}`}>
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                  {m.is_internal_note && <Lock size={11} />}
                  <span className="font-medium text-gray-700">{m.author_name || "User"}</span>
                  <span>· {new Date(m.created_at).toLocaleString()}</span>
                  {m.is_internal_note && <span className="text-amber-600 font-medium">Internal note</span>}
                </div>
                <div className="text-gray-800 whitespace-pre-wrap">{m.body}</div>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-100 pt-4">
            <div className="flex gap-2 mb-2">
              <button onClick={() => setMode("reply")} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${mode === "reply" ? "bg-primary text-primary-foreground" : "bg-gray-50 text-gray-500"}`}>
                <MessageSquare size={12} /> Reply to user
              </button>
              <button onClick={() => setMode("note")} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${mode === "note" ? "bg-amber-500 text-white" : "bg-gray-50 text-gray-500"}`}>
                <Lock size={12} /> Internal note
              </button>
            </div>
            <Textarea
              value={mode === "reply" ? replyText : noteText}
              onChange={(e) => mode === "reply" ? setReplyText(e.target.value) : setNoteText(e.target.value)}
              placeholder={mode === "reply" ? "Reply — the user gets an email notification…" : "Note visible only to admins…"}
              rows={3}
            />
            <button
              disabled={busy || !(mode === "reply" ? replyText.trim() : noteText.trim())}
              onClick={send}
              className="mt-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40"
            >
              {busy ? "Sending…" : mode === "reply" ? "Send reply" : "Add note"}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Ticket info</h3>
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-xs text-gray-400 mb-1">Priority</div>
                <Badge variant="outline">{ticket.priority}</Badge>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">Category</div>
                <span className="capitalize">{ticket.category.replace("_", " ")}</span>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">Created</div>
                {new Date(ticket.created_at).toLocaleString()}
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">Assigned to</div>
                {ticket.assigned_admin_name || "Unassigned"}
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 space-y-2">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Actions</h3>
            <button onClick={toggleAssignToMe} className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">
              {ticket.assigned_admin_id === session.id ? <><UserX size={14} /> Unassign myself</> : <><UserCheck size={14} /> Assign to me</>}
            </button>
            {ticket.status === "closed" ? (
              <button onClick={() => setStatus("open")} className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">
                <RotateCcw size={14} /> Reopen
              </button>
            ) : (
              <button onClick={() => setStatus("closed")} className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
                <CheckCircle2 size={14} /> Close ticket
              </button>
            )}
            <button disabled title="Coming soon" className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-400 cursor-not-allowed">
              <MessageCircle size={14} /> WhatsApp (placeholder)
            </button>
            <button disabled title="Coming soon" className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-400 cursor-not-allowed">
              <CalendarClock size={14} /> Book meeting (placeholder)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
