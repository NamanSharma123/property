"use client"

import { Layout, Pointer, Zap } from "lucide-react"
import { Feature108 } from "@/app/_components/Landing/Features/featureelement"

const featuresData = {
  badge: "Property Management",
  heading: "Streamline Your Property Management with Powerful Features",
  description: "Discover tools that help you manage properties efficiently and maximize your ROI.",
  tabs: [
    {
      value: "tab-1",
      icon: <Zap className="h-auto w-4 shrink-0" />,
      label: "Automated Workflows",
      content: {
        badge: "Smart Automation",
        title: "Automate repetitive tasks and save time.",
        description:
          "Streamline your property management with automated workflows that handle maintenance requests, tenant communications, and financial reporting. Focus on growing your portfolio while we handle the day-to-day operations.",
        buttonText: "See Features",
        imageSrc:
          "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop",
        imageAlt: "Automated property management",
      },
    },
    {
      value: "tab-2",
      icon: <Pointer className="h-auto w-4 shrink-0" />,
      label: "Financial Insights",
      content: {
        badge: "Real-Time Analytics",
        title: "Make data-driven decisions with comprehensive financial insights.",
        description:
          "Track income, expenses, and cash flow in real-time. Get detailed reports and analytics that help you understand your property performance and identify opportunities for growth.",
        buttonText: "View Reports",
        imageSrc:
          "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop",
        imageAlt: "Financial analytics dashboard",
      },
    },
    {
      value: "tab-3",
      icon: <Layout className="h-auto w-4 shrink-0" />,
      label: "Property Portfolio",
      content: {
        badge: "Centralized Management",
        title: "Manage all your properties from one powerful platform.",
        description:
          "Keep track of multiple properties, tenants, and transactions in one place. Access comprehensive property details, maintenance history, and tenant information whenever you need it.",
        buttonText: "Explore Platform",
        imageSrc:
          "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&h=600&fit=crop",
        imageAlt: "Property portfolio management",
      },
    },
  ],
}

export default function Services() {
  return <Feature108 {...featuresData} />
}
