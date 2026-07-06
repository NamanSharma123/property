"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Check, Star, Download, FileText } from "lucide-react"

const plans = [
    {
        name: "Free",
        price: 0,
        period: "forever",
        description: "For getting started",
        features: ["1 property", "Basic reports", "Email support"],
        current: false,
    },
    {
        name: "Investment Residential",
        price: 29,
        period: "month",
        description: "For residential investors",
        features: ["Up to 5 properties", "Full tax reports", "Bank feeds", "Depreciation tracking", "Priority support"],
        current: false,
    },
    {
        name: "Premium",
        price: 79,
        period: "month",
        description: "For serious investors",
        features: [
            "Unlimited properties",
            "All report types",
            "Advisor portal",
            "API access",
            "Dedicated support",
            "Custom integrations",
        ],
        current: true,
        popular: true,
    },
    {
        name: "Commercial",
        price: 149,
        period: "month",
        description: "For commercial portfolios",
        features: [
            "Unlimited commercial",
            "Multi-entity support",
            "Advanced analytics",
            "White-label reports",
            "Account manager",
        ],
        current: false,
    },
]

const invoices = [
    { id: "INV-2024-011", date: "Nov 1, 2024", amount: 79, status: "paid" },
    { id: "INV-2024-010", date: "Oct 1, 2024", amount: 79, status: "paid" },
    { id: "INV-2024-009", date: "Sep 1, 2024", amount: 79, status: "paid" },
    { id: "INV-2024-008", date: "Aug 1, 2024", amount: 79, status: "paid" },
]

export function SubscriptionSection() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Subscription & Billing</h1>
                    <p className="text-muted-foreground">Manage your plan and payment details</p>
                </div>
            </div>

            {/* Current Plan */}
            <Card className="border-primary">
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                                <Star className="w-7 h-7 text-primary" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-xl font-bold">Premium Plan</h3>
                                    <Badge className="bg-primary">Current</Badge>
                                </div>
                                <p className="text-muted-foreground">$79/month • Renews Dec 1, 2024</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline">Change Plan</Button>
                            <Button variant="outline">Cancel Subscription</Button>
                        </div>
                    </div>

                    {/* Usage */}
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 rounded-lg bg-muted/50">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-muted-foreground">Properties</span>
                                <span className="text-sm font-medium">3 / Unlimited</span>
                            </div>
                            <Progress value={30} className="h-2" />
                        </div>
                        <div className="p-4 rounded-lg bg-muted/50">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-muted-foreground">Advisors</span>
                                <span className="text-sm font-medium">3 / Unlimited</span>
                            </div>
                            <Progress value={30} className="h-2" />
                        </div>
                        <div className="p-4 rounded-lg bg-muted/50">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-muted-foreground">Storage</span>
                                <span className="text-sm font-medium">2.4 GB / 50 GB</span>
                            </div>
                            <Progress value={5} className="h-2" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Plans */}
            <div>
                <h2 className="text-lg font-semibold mb-4">Available Plans</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {plans.map((plan) => (
                        <Card key={plan.name} className={plan.current ? "border-primary ring-1 ring-primary" : ""}>
                            <CardContent className="p-5">
                                {plan.popular && <Badge className="mb-3 bg-primary">Most Popular</Badge>}
                                <h3 className="font-semibold text-lg">{plan.name}</h3>
                                <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                                <div className="mb-4">
                                    <span className="text-3xl font-bold">${plan.price}</span>
                                    <span className="text-muted-foreground">/{plan.period}</span>
                                </div>
                                <ul className="space-y-2 mb-6">
                                    {plan.features.map((feature) => (
                                        <li key={feature} className="flex items-center gap-2 text-sm">
                                            <Check className="w-4 h-4 text-emerald-500" />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                                <Button className="w-full" variant={plan.current ? "secondary" : "outline"} disabled={plan.current}>
                                    {plan.current ? "Current Plan" : "Select Plan"}
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Payment Method & Invoices */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Payment Method */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Payment Method</CardTitle>
                        <CardDescription>Manage your payment details</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between p-4 rounded-lg border">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-8 rounded bg-gradient-to-r from-blue-600 to-blue-800 flex items-center justify-center">
                                    <span className="text-white text-xs font-bold">VISA</span>
                                </div>
                                <div>
                                    <p className="font-medium">•••• •••• •••• 4242</p>
                                    <p className="text-sm text-muted-foreground">Expires 12/2026</p>
                                </div>
                            </div>
                            <Button variant="outline" size="sm">
                                Update
                            </Button>
                        </div>
                        <div className="mt-4 p-4 rounded-lg bg-muted/50">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium">Billing Address</p>
                                    <p className="text-sm text-muted-foreground">123 George Street, Sydney NSW 2000</p>
                                </div>
                                <Button variant="ghost" size="sm">
                                    Edit
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Invoices */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-base">Billing History</CardTitle>
                                <CardDescription>Download your invoices</CardDescription>
                            </div>
                            <Button variant="outline" size="sm">
                                View All
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {invoices.map((invoice) => (
                                <div
                                    key={invoice.id}
                                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <FileText className="w-4 h-4 text-muted-foreground" />
                                        <div>
                                            <p className="text-sm font-medium">{invoice.id}</p>
                                            <p className="text-xs text-muted-foreground">{invoice.date}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="font-medium">${invoice.amount}</span>
                                        <Badge variant="secondary" className="text-xs bg-emerald-50 text-emerald-700">
                                            Paid
                                        </Badge>
                                        <Button variant="ghost" size="icon" className="w-8 h-8">
                                            <Download className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
