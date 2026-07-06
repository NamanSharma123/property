"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Plus,
  Upload,
  Download,
  Filter,
  Search,
  Receipt,
  PiggyBank,
  CreditCard,
} from "lucide-react"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line } from "recharts"

// Monthly data - will be populated from real transaction data
const monthlyData: { month: string; income: number; expenses: number; net: number }[] = []

// Transactions - will be fetched from real API data
const transactions: {
  id: number;
  type: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  property: string;
}[] = []

// Expense categories - will be calculated from real transaction data
const expenseCategories: { name: string; amount: number; percent: number }[] = []

export function FinancialsSection() {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header - Stack on mobile */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Financial Management</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Track income, expenses, and performance</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 sm:flex-none bg-transparent">
            <Upload className="w-4 h-4 mr-1 sm:mr-2" />
            <span className="hidden xs:inline">Upload</span> Receipt
          </Button>
          <Button size="sm" className="flex-1 sm:flex-none">
            <Plus className="w-4 h-4 mr-1 sm:mr-2" />
            Add <span className="hidden xs:inline">Transaction</span>
          </Button>
        </div>
      </div>

      {/* Stats - 2 cols on mobile */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">YTD Income</p>
                <p className="text-lg sm:text-xl font-bold">$0</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">No data yet</p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0 ml-2">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">YTD Expenses</p>
                <p className="text-lg sm:text-xl font-bold">$0</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">No data yet</p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-rose-500/10 flex items-center justify-center flex-shrink-0 ml-2">
                <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Net Cash Flow</p>
                <p className="text-lg sm:text-xl font-bold">$0</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">No data yet</p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 ml-2">
                <PiggyBank className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground">Pending</p>
                <p className="text-lg sm:text-xl font-bold">$0</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">0 transactions</p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0 ml-2">
                <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs - Scrollable tabs on mobile */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full sm:w-auto overflow-x-auto flex-nowrap justify-start">
          <TabsTrigger value="overview" className="flex-shrink-0">
            Overview
          </TabsTrigger>
          <TabsTrigger value="income" className="flex-shrink-0">
            Income
          </TabsTrigger>
          <TabsTrigger value="expenses" className="flex-shrink-0">
            Expenses
          </TabsTrigger>
          <TabsTrigger value="transactions" className="flex-shrink-0">
            Transactions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 sm:mt-6 space-y-4 sm:space-y-6">
          {/* Cash Flow Chart */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="text-base">Cash Flow Overview</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Monthly income, expenses, and net cash flow
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-500" />
                    Income
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-rose-500" />
                    Expenses
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-primary" />
                    Net
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[220px] sm:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyData}>
                    <defs>
                      <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#6b7280" }} />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "#6b7280" }}
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                      width={40}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                      formatter={(value) => [`$${Number(value || 0).toLocaleString()}`, ""]}
                    />
                    <Area
                      type="monotone"
                      dataKey="income"
                      stroke="#10b981"
                      strokeWidth={2}
                      fill="url(#incomeGradient)"
                    />
                    <Line type="monotone" dataKey="expenses" stroke="#f43f5e" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="net" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Expense Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Expense Breakdown</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Year-to-date expenses by category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 sm:space-y-4">
                {expenseCategories.map((category) => (
                  <div key={category.name} className="space-y-1.5 sm:space-y-2">
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="font-medium">{category.name}</span>
                      <span className="text-muted-foreground">
                        ${category.amount.toLocaleString()} ({category.percent}%)
                      </span>
                    </div>
                    <div className="h-1.5 sm:h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${category.percent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="income" className="mt-4 sm:mt-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="text-base">Income Summary</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">All income sources</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 sm:space-y-4">
                {transactions
                  .filter((t) => t.type === "income")
                  .map((transaction) => (
                    <TransactionRow key={transaction.id} transaction={transaction} />
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="mt-4 sm:mt-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="text-base">Expense Summary</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">All expenses</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 sm:space-y-4">
                {transactions
                  .filter((t) => t.type === "expense")
                  .map((transaction) => (
                    <TransactionRow key={transaction.id} transaction={transaction} />
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="mt-4 sm:mt-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">All Transactions</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Complete transaction history</CardDescription>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Search transactions..." className="pl-9 w-full sm:w-64" />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" className="flex-shrink-0 bg-transparent">
                      <Filter className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 sm:flex-none bg-transparent">
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 sm:space-y-3">
                {transactions.map((transaction) => (
                  <TransactionRow key={transaction.id} transaction={transaction} />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function TransactionRow({ transaction }: { transaction: (typeof transactions)[0] }) {
  const isIncome = transaction.type === "income"

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors gap-3">
      <div className="flex items-center gap-3 sm:gap-4">
        <div
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isIncome ? "bg-emerald-100" : "bg-rose-100"
            }`}
        >
          {isIncome ? (
            <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
          ) : (
            <Receipt className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm truncate">{transaction.description}</p>
          <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
            <span className="truncate">{transaction.property}</span>
            <span className="hidden sm:inline">•</span>
            <Badge variant="secondary" className="text-[10px] sm:text-xs">
              {transaction.category}
            </Badge>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between sm:justify-end sm:text-right pl-12 sm:pl-0">
        <p className={`font-semibold text-sm ${isIncome ? "text-emerald-600" : "text-rose-600"}`}>
          {isIncome ? "+" : "-"}${transaction.amount.toLocaleString()}
        </p>
        <p className="text-xs sm:text-sm text-muted-foreground sm:hidden">{transaction.date}</p>
        <p className="text-sm text-muted-foreground hidden sm:block ml-4">{transaction.date}</p>
      </div>
    </div>
  )
}
