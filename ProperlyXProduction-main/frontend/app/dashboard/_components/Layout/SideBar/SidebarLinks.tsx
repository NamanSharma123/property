import {
  LayoutDashboard,
  Home,
  Building2,
  FileText,
  ArrowLeftRight,
  ClipboardCheck,
  FolderOpen,
  ShieldCheck,
  TrendingDown,
  Ticket,
  ScanText
} from "lucide-react";

export interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
}

export const menuItems: MenuItem[] = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={20} />, href: "/dashboard" },
  { id: "property", label: "Property", icon: <Home size={20} />, href: "/dashboard/property" },
  { id: "bank", label: "Bank", icon: <Building2 size={20} />, href: "/dashboard/bank" },
  { id: "reports", label: "Reports", icon: <FileText size={20} />, href: "/dashboard/reports" },
  { id: "transactions", label: "Transactions", icon: <ArrowLeftRight size={20} />, href: "/dashboard/transactions" },
  { id: "audit", label: "Audit Checks", icon: <ClipboardCheck size={20} />, href: "/dashboard/audit" },
  { id: "documents", label: "Documents", icon: <FolderOpen size={20} />, href: "/dashboard/documents" },
  { id: "advisors", label: "Trusted Advisors", icon: <ShieldCheck size={20} />, href: "/dashboard/advisors" },
  { id: "depreciation", label: "Depreciation", icon: <TrendingDown size={20} />, href: "/dashboard/depreciation" },
  { id: "support", label: "Support Tickets", icon: <Ticket size={20} />, href: "/dashboard/tickets" },
  { id: "ocr", label: "OCR Upload", icon: <ScanText size={20} />, href: "/dashboard/ocr" },
];