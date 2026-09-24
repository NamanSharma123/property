'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, DollarSign, PiggyBank, Building2, Receipt } from "lucide-react";
import { useRouter } from 'next/navigation';
import { useDashboardSWR } from "@/hooks/useDashboardSWR";
import { DashboardSkeleton } from "@/components/ui/skeletons";

interface DashboardProps {
  userName?: string;
  /** The unique OCR inbound-email alias — the address a property manager
   *  should actually be told to email statements to (the account's
   *  internal uniqueId reference is not an email address at all). */
  inboundEmail?: string;
}

const Dashboard = ({ userName = 'User', inboundEmail }: DashboardProps) => {
  const router = useRouter();
  const { summary: data, isLoading } = useDashboardSWR();

  const formatCurrency = (amount: number): string => {
    const isNegative = amount < 0;
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(amount));
    return isNegative ? `-${formatted}` : formatted;
  };

  const formatCurrencyWithCents = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  if (isLoading || !data) {
    return <DashboardSkeleton />;
  }

  // Calculate overall interest rate based on loans (mock calculation)
  const overallInterestRate = data.totalLoan > 0 ? 5.93 : 0;
  const estimatedRepayment = data.totalLoan > 0 ? Math.round(data.totalLoan * 0.45) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Hey {userName}! Welcome to the Dashboard!</h1>
        <div className="flex gap-2">
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => router.push('/dashboard/property')}
          >
            + Add Property
          </Button>
          <Button
            className="bg-yellow-400 hover:bg-yellow-500 text-black"
            onClick={() => router.push('/dashboard/ocr')}
          >
            + Add Income / Expense
          </Button>
        </div>
      </div>

      {/* Financial Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Net Income (YTD)
            </CardTitle>
            {data.netIncome >= 0 ? (
              <TrendingUp className="h-5 w-5 text-green-500" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${data.netIncome >= 0 ? 'text-green-600' : 'text-blue-500'}`}>
              {formatCurrency(data.netIncome)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Income: {formatCurrency(data.totalIncome)} | Expenses: {formatCurrency(data.totalExpenses)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Properties
            </CardTitle>
            <Building2 className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{data.propertyCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total properties in portfolio
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Est Market Value
            </CardTitle>
            <Building2 className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{formatCurrency(data.totalMarketValue)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Net Equity
            </CardTitle>
            <PiggyBank className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{formatCurrency(data.netEquity)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Loan Balance and Interest */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 bg-primary text-primary-foreground bg-blue-500">
          <CardHeader>
            <CardTitle>Current Loan Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold mb-4">{formatCurrency(data.totalLoan)}</div>
            <div className="flex items-center justify-between pt-4 border-t border-primary-foreground/20">
              <div>
                <div className="text-sm opacity-90">Est. Repayment</div>
                <div className="text-2xl font-bold">{formatCurrency(estimatedRepayment)}</div>
              </div>
              <div className="text-right">
                <div className="text-sm opacity-90">Overall Interest</div>
                <div className="text-2xl font-bold">{overallInterestRate.toFixed(2)}%</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 space-y-6">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Fixed Interest</div>
              <div className="text-3xl font-bold text-blue-500">0.00%</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Variable Interest</div>
              <div className="text-3xl font-bold text-blue-500">{overallInterestRate.toFixed(2)}%</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Available Redraw</div>
              <div className="text-3xl font-bold text-blue-500">$0</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Tasks and Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Pending Tasks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-4 p-4 border border-border rounded-lg">
              <div className="p-2 bg-info/10 rounded-lg">
                <Building2 className="w-5 h-5 text-info" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold mb-1">Connect Bank</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Connect Loan Account for automatic updates of interest and other charges.
                </p>
                <div className="flex gap-2">
                  <Button size="sm" className="bg-blue-500 hover:bg-blue-700 text-white">Connect</Button>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 border border-border rounded-lg">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Receipt className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold mb-1">Rent Summary</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Advise your property manager to email monthly Rental Summary to{' '}
                  <span className="font-medium text-foreground">{inboundEmail || 'your unique OCR email (see Settings)'}</span>
                </p>
                <Button size="sm" variant="outline" className="bg-yellow-400 hover:bg-yellow-500 text-black">
                  Email Now
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Transactions</CardTitle>
            <Button
              variant="link"
              className="text-primary"
              onClick={() => router.push('/dashboard/ocr')}
            >
              Add More +
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.recentTransactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Receipt className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No transactions yet</p>
                  <Button
                    variant="link"
                    className="text-blue-600"
                    onClick={() => router.push('/dashboard/ocr')}
                  >
                    Add your first transaction
                  </Button>
                </div>
              ) : (
                data.recentTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        {transaction.type === 'income' ? (
                          <DollarSign className="w-4 h-4 text-green-600" />
                        ) : (
                          <Receipt className="w-4 h-4 text-primary" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{transaction.categoryLabel}</div>
                        <div className="text-sm text-muted-foreground">{transaction.propertyName}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-semibold ${transaction.type === 'income' ? 'text-green-600' : 'text-destructive'
                        }`}>
                        {transaction.type === 'income' ? '+' : '-'}{formatCurrencyWithCents(transaction.amount)}
                      </div>
                      <div className="text-xs text-muted-foreground">{transaction.date}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
