'use client';

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, MessageSquare, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ticketsApi, SupportTicket as SupportTicketRow } from "@/lib/api";

const CATEGORY_OPTIONS = [
  { value: "bug", label: "Technical Issue" },
  { value: "billing", label: "Billing Question" },
  { value: "feature_request", label: "Feature Request" },
  { value: "other", label: "Other" },
];

const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};

const STATUS_TONE: Record<string, string> = {
  open: "bg-info/10 text-info border-info/20",
  in_progress: "bg-warning/10 text-warning border-warning/20",
  resolved: "bg-success/10 text-success border-success/20",
  closed: "bg-success/10 text-success border-success/20",
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-AU", { year: "numeric", month: "short", day: "numeric" });

const SupportTicket = () => {
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [tickets, setTickets] = useState<SupportTicketRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTickets = async () => {
    setLoading(true);
    const res = await ticketsApi.getAll({ limit: 10 });
    if (res.success && res.data) {
      setTickets(res.data.tickets);
    } else if (res.error) {
      toast.error(res.error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const resetForm = () => {
    setSubject("");
    setCategory("");
    setPriority("");
    setDescription("");
  };

  const handleSubmit = async () => {
    if (!subject.trim() || !category || !priority || !description.trim()) {
      toast.error("Please fill in every field before submitting");
      return;
    }

    setSubmitting(true);
    const res = await ticketsApi.create({
      subject: subject.trim(),
      message: description.trim(),
      category,
      priority,
    });
    setSubmitting(false);

    if (res.success) {
      toast.success("Support ticket submitted");
      resetForm();
      loadTickets();
    } else {
      toast.error(res.error || "Failed to submit ticket");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-2">Support Center</h1>
          <p className="text-muted-foreground">Create and track your support tickets</p>
        </div>
        <Button onClick={handleSubmit} disabled={submitting}>
          <Plus className="w-4 h-4 mr-2" />
          New Ticket
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Create New Ticket</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Subject*</Label>
              <Input
                placeholder="Brief description of your issue"
                className="mt-2"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            <div>
              <Label>Category*</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Priority*</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Description*</Label>
              <Textarea
                placeholder="Provide detailed information about your issue"
                className="mt-2 min-h-[120px]"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <Button className="w-full" onClick={handleSubmit} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting…
                </>
              ) : (
                "Submit Ticket"
              )}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Tickets</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <p className="text-sm text-muted-foreground text-center py-4">Loading…</p>
              ) : tickets.length === 0 ? (
                <div className="p-4 border rounded-lg">
                  <p className="font-semibold">No Issues Yet</p>
                  <p className="text-sm text-muted-foreground">Submit a ticket and it&apos;ll show up here.</p>
                </div>
              ) : (
                tickets.map((ticket) => (
                  <div key={ticket.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold">{ticket.subject}</p>
                        <p className="text-sm text-muted-foreground">
                          #{ticket.id.slice(0, 8)} • {formatDate(ticket.created_at)}
                        </p>
                      </div>
                      <MessageSquare className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline" className={STATUS_TONE[ticket.status] || ""}>
                        {STATUS_LABEL[ticket.status] || ticket.status}
                      </Badge>
                      <Badge variant="secondary">{ticket.priority}</Badge>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SupportTicket;
