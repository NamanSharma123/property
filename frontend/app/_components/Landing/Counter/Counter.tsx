"use client"

import { Lock, CheckCircle, Shield, FileCheck } from "lucide-react"
import { Card } from "@/components/ui/card"

export default function counter() {
  const badges = [
    {
      icon: Lock,
      title: "ISO 27001 Certified",
      description: "Enterprise-grade information security management",
    },
    {
      icon: CheckCircle,
      title: "SOC 2 Compliant",
      description: "Security, availability, and confidentiality verified",
    },
    {
      icon: Shield,
      title: "GDPR Compliant",
      description: "Full compliance with data protection regulations",
    },
    {
      icon: FileCheck,
      title: "HIPAA Ready",
      description: "Healthcare data security standards met",
    },
  ]

  return (
    <section className="py-20 bg-gradient-to-b from-white to-[#F9FAFB]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-[#2D3E50] mb-4">Security & Compliance You Can Trust</h2>
          <p className="text-lg text-foreground/60">Industry-leading certifications and security standards</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {badges.map((badge, idx) => {
            const Icon = badge.icon
            return (
              <Card
                key={idx}
                className="p-8 border-0 bg-white text-center shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 bg-[#FF6B35]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-6 h-6 text-[#FF6B35]" />
                </div>
                <h3 className="font-bold text-[#2D3E50] mb-2">{badge.title}</h3>
                <p className="text-sm text-foreground/60">{badge.description}</p>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}
