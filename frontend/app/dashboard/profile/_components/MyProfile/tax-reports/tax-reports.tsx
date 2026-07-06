"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    FileText,
    Download,
    Mail,
    Share2,
    Calendar,
    TrendingUp,
    TrendingDown,
    Building2,
    Calculator,
    Percent,
    Eye,
    Printer,
    CheckCircle2,
    Clock,
} from "lucide-react"

// Tax summary - will be populated from real transaction data
const taxSummary = {
    totalIncome: 0,
    totalExpenses: 0,
    netIncome: 0,
    depreciation: 0,
    taxableIncome: 0,
    estimatedTax: 0,
    effectiveRate: 0,
}

// Reports will be generated when user creates them
const reports: { id: number; name: string; type: string; date: string; status: string }[] = []

// Depreciation schedule - will be populated from user's asset data
const depreciation: { asset: string; originalValue: number; currentYear: number; total: number; remaining: number }[] = []

export function TaxReportsSection() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Tax & Reports</h1>
                    <p className="text-muted-foreground">Generate and manage your tax documents and financial reports</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                        <Share2 className="w-4 h-4 mr-2" />
                        Share with Accountant
                    </Button>
                    <Button size="sm">
                        <FileText className="w-4 h-4 mr-2" />
                        Generate Report
                    </Button>
                </div>
            </div>

            {/* Tax Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Income</p>
                                <p className="text-xl font-bold">${(taxSummary.totalIncome / 1000).toFixed(1)}K</p>
                            </div>
                            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                <TrendingUp className="w-5 h-5 text-emerald-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Deductions</p>
                                <p className="text-xl font-bold">${(taxSummary.totalExpenses / 1000).toFixed(1)}K</p>
                            </div>
                            <div className="w-10 h-10 rounded-lg bg-rose-500/10 flex items-center justify-center">
                                <TrendingDown className="w-5 h-5 text-rose-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Taxable Income</p>
                                <p className="text-xl font-bold">${(taxSummary.taxableIncome / 1000).toFixed(1)}K</p>
                            </div>
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Calculator className="w-5 h-5 text-primary" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Est. Tax</p>
                                <p className="text-xl font-bold">${(taxSummary.estimatedTax / 1000).toFixed(1)}K</p>
                                <p className="text-xs text-muted-foreground">{taxSummary.effectiveRate}% effective</p>
                            </div>
                            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                                <Percent className="w-5 h-5 text-amber-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="summary" className="w-full">
                <TabsList>
                    <TabsTrigger value="summary">Tax Summary</TabsTrigger>
                    <TabsTrigger value="depreciation">Depreciation</TabsTrigger>
                    <TabsTrigger value="reports">All Reports</TabsTrigger>
                </TabsList>

                <TabsContent value="summary" className="mt-6 space-y-6">
                    {/* Income Tax Summary */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-base">Income Tax Summary FY2024</CardTitle>
                                    <CardDescription>July 2023 - June 2024</CardDescription>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm">
                                        <Eye className="w-4 h-4 mr-2" />
                                        Preview
                                    </Button>
                                    <Button variant="outline" size="sm">
                                        <Printer className="w-4 h-4 mr-2" />
                                        Print
                                    </Button>
                                    <Button size="sm">
                                        <Download className="w-4 h-4 mr-2" />
                                        Download PDF
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                {/* Income Section */}
                                <div className="space-y-3">
                                    <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Income</h4>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                                            <span>Gross Rental Income</span>
                                            <span className="font-semibold">${taxSummary.totalIncome.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Deductions Section */}
                                <div className="space-y-3">
                                    <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Deductions</h4>
                                    <div className="space-y-2">
                                        {taxSummary.totalExpenses === 0 ? (
                                            <div className="flex justify-center items-center p-6 rounded-lg bg-muted/30 text-muted-foreground">
                                                <span>No deductions recorded yet</span>
                                            </div>
                                        ) : (
                                            <div className="flex justify-between items-center p-3 rounded-lg bg-rose-50 font-semibold">
                                                <span>Total Deductions</span>
                                                <span className="text-rose-600">-${taxSummary.totalExpenses.toLocaleString()}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Summary */}
                                <div className="space-y-3 pt-4 border-t">
                                    <div className="flex justify-between items-center p-3 rounded-lg bg-primary/5">
                                        <span className="font-semibold">Net Rental Income</span>
                                        <span className="font-bold text-lg">${taxSummary.netIncome.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 rounded-lg bg-amber-50">
                                        <span className="font-semibold">Estimated Tax Liability</span>
                                        <span className="font-bold text-lg text-amber-700">
                                            ${taxSummary.estimatedTax.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="depreciation" className="mt-6">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-base">Depreciation Schedule</CardTitle>
                                    <CardDescription>Current year depreciation deductions</CardDescription>
                                </div>
                                <Button variant="outline" size="sm">
                                    <Download className="w-4 h-4 mr-2" />
                                    Export Schedule
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b text-left">
                                            <th className="pb-3 font-semibold text-sm">Asset</th>
                                            <th className="pb-3 font-semibold text-sm text-right">Original Value</th>
                                            <th className="pb-3 font-semibold text-sm text-right">This Year</th>
                                            <th className="pb-3 font-semibold text-sm text-right">Total Claimed</th>
                                            <th className="pb-3 font-semibold text-sm text-right">Written Down</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {depreciation.map((item) => (
                                            <tr key={item.asset} className="border-b last:border-0">
                                                <td className="py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                                            <Building2 className="w-4 h-4 text-primary" />
                                                        </div>
                                                        <span className="font-medium">{item.asset}</span>
                                                    </div>
                                                </td>
                                                <td className="py-4 text-right">${item.originalValue.toLocaleString()}</td>
                                                <td className="py-4 text-right text-emerald-600 font-medium">
                                                    ${item.currentYear.toLocaleString()}
                                                </td>
                                                <td className="py-4 text-right">${item.total.toLocaleString()}</td>
                                                <td className="py-4 text-right">${item.remaining.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-muted/50">
                                            <td className="py-4 font-semibold">Total</td>
                                            <td className="py-4 text-right font-semibold">$628,000</td>
                                            <td className="py-4 text-right font-semibold text-emerald-600">$12,425</td>
                                            <td className="py-4 text-right font-semibold">$49,700</td>
                                            <td className="py-4 text-right font-semibold">$578,300</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="reports" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Available Reports</CardTitle>
                            <CardDescription>Download or share your generated reports</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {reports.map((report) => (
                                    <div
                                        key={report.id}
                                        className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                                <FileText className="w-5 h-5 text-primary" />
                                            </div>
                                            <div>
                                                <p className="font-medium">{report.name}</p>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <Badge variant="secondary" className="text-xs">
                                                        {report.type}
                                                    </Badge>
                                                    <span>•</span>
                                                    <Calendar className="w-3 h-3" />
                                                    <span>{report.date}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {report.status === "ready" ? (
                                                <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                                    Ready
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary">
                                                    <Clock className="w-3 h-3 mr-1" />
                                                    Processing
                                                </Badge>
                                            )}
                                            <Button variant="ghost" size="icon">
                                                <Download className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon">
                                                <Mail className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
