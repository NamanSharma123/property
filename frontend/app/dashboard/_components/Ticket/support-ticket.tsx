'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, MessageSquare } from "lucide-react";

const SupportTicket = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-2">Support Center</h1>
          <p className="text-muted-foreground">Create and track your support tickets</p>
        </div>
        <Button>
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
              <Input placeholder="Brief description of your issue" className="mt-2" />
            </div>

            <div>
              <Label>Category*</Label>
              <Select>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="technical">Technical Issue</SelectItem>
                  <SelectItem value="billing">Billing Question</SelectItem>
                  <SelectItem value="feature">Feature Request</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Priority*</Label>
              <Select>
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
              />
            </div>

            <Button className="w-full">Submit Ticket</Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Tickets</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                // {
                //   id: '#TK-001',
                //   subject: 'Unable to upload documents',
                //   status: 'Open',
                //   priority: 'High',
                //   date: 'Nov 18, 2025',
                // },
                // {
                //   id: '#TK-002',
                //   subject: 'Question about billing cycle',
                //   status: 'In Progress',
                //   priority: 'Medium',
                //   date: 'Nov 17, 2025',
                // },
                // {
                //   id: '#TK-003',
                //   subject: 'Feature request: Export to Excel',
                //   status: 'Closed',
                //   priority: 'Low',
                //   date: 'Nov 15, 2025',
                // },
                {
                  id: '',
                  subject: 'No Issues Yet',
                  status: '',
                  priority: '',
                  date: '',
                }
              ].map((ticket) => (
                <div key={ticket.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold">{ticket.subject}</p>
                      <p className="text-sm text-muted-foreground">{ticket.id} • {ticket.date}</p>
                    </div>
                    <MessageSquare className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex gap-2">
                    <Badge
                      variant="outline"
                      className={
                        ticket.status === 'Open'
                          ? 'bg-info/10 text-info border-info/20'
                          : ticket.status === 'In Progress'
                            ? 'bg-warning/10 text-warning border-warning/20'
                            : 'bg-success/10 text-success border-success/20'
                      }
                    >
                      {ticket.status}
                    </Badge>
                    <Badge variant="secondary">{ticket.priority}</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>

  );
};

export default SupportTicket;
