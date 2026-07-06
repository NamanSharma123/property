"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
    HelpCircle,
    Search,
    MessageCircle,
    Mail,
    Phone,
    FileText,
    Video,
    Users,
    ExternalLink,
    ChevronRight,
    BookOpen,
    Lightbulb,
    Bug,
    Star,
} from "lucide-react"

const faqs = [
    { question: "How do I connect my bank account?", category: "Bank Feeds" },
    { question: "How is depreciation calculated?", category: "Tax" },
    { question: "Can I share reports with my accountant?", category: "Sharing" },
    { question: "How do I add a new property?", category: "Properties" },
    { question: "What's included in the Premium plan?", category: "Billing" },
]

const resources = [
    { title: "Getting Started Guide", description: "Learn the basics of TheProperty.com", icon: BookOpen, type: "Guide" },
    { title: "Video Tutorials", description: "Step-by-step video walkthroughs", icon: Video, type: "Video" },
    { title: "API Documentation", description: "For developers and integrations", icon: FileText, type: "Docs" },
    { title: "Community Forum", description: "Connect with other investors", icon: Users, type: "Community" },
]

const tickets = [
    { id: "TKT-2024-089", subject: "Bank feed sync issue", status: "open", date: "Nov 12, 2024" },
    { id: "TKT-2024-076", subject: "Report export question", status: "resolved", date: "Nov 5, 2024" },
]

export function SupportSection() {
    return (
        <div className="space-y-6 max-w-4xl">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-foreground">Support & Help</h1>
                <p className="text-muted-foreground">Get help and find answers to your questions</p>
            </div>

            {/* Search */}
            <Card>
                <CardContent className="p-6">
                    <div className="text-center mb-4">
                        <h2 className="text-lg font-semibold">How can we help you?</h2>
                        <p className="text-muted-foreground">Search our knowledge base or browse topics below</p>
                    </div>
                    <div className="relative max-w-xl mx-auto">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input placeholder="Search for help articles, tutorials, FAQs..." className="pl-12 h-12 text-base" />
                    </div>
                </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-6 text-center">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                            <MessageCircle className="w-6 h-6 text-primary" />
                        </div>
                        <h3 className="font-semibold mb-1">Live Chat</h3>
                        <p className="text-sm text-muted-foreground mb-3">Chat with our support team</p>
                        <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">
                            Online
                        </Badge>
                    </CardContent>
                </Card>
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-6 text-center">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                            <Mail className="w-6 h-6 text-primary" />
                        </div>
                        <h3 className="font-semibold mb-1">Email Support</h3>
                        <p className="text-sm text-muted-foreground mb-3">Get help via email</p>
                        <span className="text-sm text-muted-foreground">support@theproperty.com</span>
                    </CardContent>
                </Card>
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-6 text-center">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                            <Phone className="w-6 h-6 text-primary" />
                        </div>
                        <h3 className="font-semibold mb-1">Phone Support</h3>
                        <p className="text-sm text-muted-foreground mb-3">Talk to a specialist</p>
                        <span className="text-sm text-muted-foreground">1800 123 456</span>
                    </CardContent>
                </Card>
            </div>

            {/* FAQs & Resources */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* FAQs */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Frequently Asked Questions</CardTitle>
                        <CardDescription>Quick answers to common questions</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {faqs.map((faq, index) => (
                                <button
                                    key={index}
                                    className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors text-left"
                                >
                                    <div className="flex items-center gap-3">
                                        <HelpCircle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                        <span className="text-sm">{faq.question}</span>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                </button>
                            ))}
                        </div>
                        <Button variant="outline" className="w-full mt-4 bg-transparent">
                            View All FAQs
                            <ExternalLink className="w-4 h-4 ml-2" />
                        </Button>
                    </CardContent>
                </Card>

                {/* Resources */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Resources & Documentation</CardTitle>
                        <CardDescription>Learn how to get the most out of TheProperty</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {resources.map((resource, index) => (
                                <button
                                    key={index}
                                    className="w-full flex items-center gap-4 p-3 rounded-lg hover:bg-muted transition-colors text-left"
                                >
                                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                        <resource.icon className="w-5 h-5 text-primary" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium text-sm">{resource.title}</p>
                                        <p className="text-xs text-muted-foreground">{resource.description}</p>
                                    </div>
                                    <Badge variant="secondary" className="text-xs">
                                        {resource.type}
                                    </Badge>
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Support Tickets */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-base">Your Support Tickets</CardTitle>
                            <CardDescription>Track your support requests</CardDescription>
                        </div>
                        <Button size="sm">New Ticket</Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {tickets.length > 0 ? (
                        <div className="space-y-3">
                            {tickets.map((ticket) => (
                                <div key={ticket.id} className="flex items-center justify-between p-4 rounded-lg border">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium">{ticket.subject}</p>
                                            <Badge variant={ticket.status === "open" ? "default" : "secondary"}>
                                                {ticket.status === "open" ? "Open" : "Resolved"}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            {ticket.id} • {ticket.date}
                                        </p>
                                    </div>
                                    <Button variant="outline" size="sm">
                                        View
                                    </Button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            <HelpCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>No support tickets yet</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Feedback */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Send Feedback</CardTitle>
                    <CardDescription>Help us improve TheProperty.com</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-3 mb-4">
                        <Button variant="outline" className="flex-1 bg-transparent">
                            <Lightbulb className="w-4 h-4 mr-2" />
                            Feature Request
                        </Button>
                        <Button variant="outline" className="flex-1 bg-transparent">
                            <Bug className="w-4 h-4 mr-2" />
                            Report Bug
                        </Button>
                        <Button variant="outline" className="flex-1 bg-transparent">
                            <Star className="w-4 h-4 mr-2" />
                            General Feedback
                        </Button>
                    </div>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="subject">Subject</Label>
                            <Input id="subject" placeholder="Brief description of your feedback" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="message">Message</Label>
                            <Textarea id="message" placeholder="Tell us more..." rows={4} />
                        </div>
                        <Button>Submit Feedback</Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
