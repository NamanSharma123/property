'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, CreditCard } from "lucide-react";

const Subscription = () => {
  return (
   
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Manage Your Subscription</h1>
          <p className="text-muted-foreground">View and manage your current subscription plan</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Current Plan</CardTitle>
              <Badge className="bg-primary">Active</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-xl font-bold mb-1">Professional Plan</h3>
              <p className="text-muted-foreground">$49.99 per month</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-success" />
                <span className="text-sm">Unlimited properties</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-success" />
                <span className="text-sm">Advanced reporting</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-success" />
                <span className="text-sm">Priority support</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-success" />
                <span className="text-sm">OCR document processing</span>
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">Next billing date</p>
                  <p className="font-semibold">December 19, 2025</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="font-semibold">$49.99</p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1">
                  <CreditCard className="w-4 h-4 mr-2" />
                  Update Payment
                </Button>
                <Button variant="outline" className="flex-1">
                  Change Plan
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Billing History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { date: 'Nov 19, 2025', amount: '$49.99', status: 'Paid' },
                { date: 'Oct 19, 2025', amount: '$49.99', status: 'Paid' },
                { date: 'Sep 19, 2025', amount: '$49.99', status: 'Paid' },
              ].map((invoice, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{invoice.date}</p>
                    <p className="text-sm text-muted-foreground">{invoice.amount}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                      {invoice.status}
                    </Badge>
                    <Button variant="ghost" size="sm">Download</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    
  );
};

export default Subscription;
