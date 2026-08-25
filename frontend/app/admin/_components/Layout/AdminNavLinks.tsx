import {
  LayoutDashboard,
  Users,
  ScrollText,
  Building2,
  ArrowLeftRight,
  FolderOpen,
  Landmark,
  ScanText,
  Ticket,
  CreditCard,
  Tags,
  BarChart3,
  Settings,
} from "lucide-react";

export interface AdminMenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
  adminOnly?: boolean; // hidden from Support Admins (role='manager')
}

export const adminMenuItems: AdminMenuItem[] = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={20} />, href: "/admin/dashboard" },
  { id: "users", label: "Users", icon: <Users size={20} />, href: "/admin/users" },
  { id: "properties", label: "Properties", icon: <Building2 size={20} />, href: "/admin/properties" },
  { id: "transactions", label: "Transactions", icon: <ArrowLeftRight size={20} />, href: "/admin/transactions" },
  { id: "ocr-review", label: "OCR Review", icon: <ScanText size={20} />, href: "/admin/ocr-review" },
  { id: "documents", label: "Documents", icon: <FolderOpen size={20} />, href: "/admin/documents" },
  { id: "loans", label: "Loans", icon: <Landmark size={20} />, href: "/admin/loans" },
  { id: "support", label: "Support Tickets", icon: <Ticket size={20} />, href: "/admin/support" },
  { id: "categories", label: "Categories", icon: <Tags size={20} />, href: "/admin/categories" },
  { id: "subscriptions", label: "Subscriptions", icon: <CreditCard size={20} />, href: "/admin/subscriptions", adminOnly: true },
  { id: "reports", label: "Reports", icon: <BarChart3 size={20} />, href: "/admin/reports", adminOnly: true },
  { id: "audit-logs", label: "Audit Logs", icon: <ScrollText size={20} />, href: "/admin/audit-logs", adminOnly: true },
  { id: "settings", label: "Settings", icon: <Settings size={20} />, href: "/admin/settings", adminOnly: true },
];
