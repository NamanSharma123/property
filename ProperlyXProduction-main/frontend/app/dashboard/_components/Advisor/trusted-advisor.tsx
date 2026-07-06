'use client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, TrendingUp, Shield, FileText } from "lucide-react";

const TrustedAdvisor = () => {
  return (
    
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Financial Insights & Recommendations</h1>
          <p className="text-muted-foreground">Get personalized advice to optimize your property portfolio</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-warning/10 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-warning" />
                </div>
                <CardTitle>Action Required</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Review your loan structures to potentially save on interest costs
              </p>
              <Button size="sm" variant="outline">View Details</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-success/10 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-success" />
                </div>
                <CardTitle>Growth Opportunities</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Your equity position allows for potential property acquisitions
              </p>
              <Button size="sm" variant="outline">Learn More</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-info/10 rounded-lg">
                  <Shield className="w-6 h-6 text-info" />
                </div>
                <CardTitle>Risk Assessment</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Your portfolio risk profile is moderate. Consider diversification
              </p>
              <Button size="sm" variant="outline">View Report</Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 border rounded-lg">
                <FileText className="w-5 h-5 text-primary mt-1" />
                <div className="flex-1">
                  <h4 className="font-semibold mb-1">Tax Optimization Strategy</h4>
                  <p className="text-sm text-muted-foreground">
                    Consider restructuring ownership to maximize tax benefits
                  </p>
                  <Button size="sm" variant="link" className="px-0">Read More →</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    
  );
};

export default TrustedAdvisor;
