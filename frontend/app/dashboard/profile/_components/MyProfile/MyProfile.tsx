"use client"

import type React from "react"

export type Section =
  | "profile"
  | "portfolio"
  | "financials"
  | "tax-reports"
  | "documents"
  | "advisors"
  | "subscription"
  | "settings"
  | "security"
  | "support"

// Import all section components
import { ProfileSection } from "./portfolio/profile"
//import { PortfolioSection } from "./portfolio/portfolio"
import { FinancialsSection } from "./Financials/financials"
import { TaxReportsSection } from "./tax-reports/tax-reports"
import { DocumentsSection } from "./Document/documents"
import { AdvisorsSection } from "./Advisors/advisors"
import { SubscriptionSection } from "./Subscription/subscription"
// import { SettingsSection } from "./Settings/settings"
import { SecuritySection } from "./Security/Security"
import { SupportSection } from "./Support/support"

export interface UserData {
  name: string;
  email: string;
  uniqueId: string;
  phone?: string;
  createdAt?: string;
}

// Dashboard Content Component
export function DashboardContent({ activeSection, user }: { activeSection: Section; user?: UserData }) {
  const sections: Record<Section, React.ReactNode> = {
    profile: <ProfileSection user={user} />,
    portfolio: <div className="text-muted-foreground text-center py-10">Portfolio section coming soon</div>,
    financials: <FinancialsSection />,
    "tax-reports": <TaxReportsSection />,
    documents: <DocumentsSection />,
    advisors: <AdvisorsSection />,
    subscription: <SubscriptionSection />,
    settings: <div className="text-muted-foreground text-center py-10">Settings section coming soon</div>,
    security: <SecuritySection />,
    support: <SupportSection />,
  }

  return <div className="p-4 sm:p-6">{sections[activeSection]}</div>
}


