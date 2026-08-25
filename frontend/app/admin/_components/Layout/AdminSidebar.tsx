"use client"

import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight, ShieldCheck, X } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { adminMenuItems } from "./AdminNavLinks"

interface AdminSidebarProps {
  isOpen: boolean
  onToggle: () => void
  isMobile?: boolean
  isFullAdmin: boolean // false = Support Admin (role='manager'); hides adminOnly items
}

export function AdminSidebar({ isOpen, onToggle, isMobile, isFullAdmin }: AdminSidebarProps) {
  const pathname = usePathname()

  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + "/")

  const items = adminMenuItems.filter((item) => isFullAdmin || !item.adminOnly)

  return (
    <aside
      className={cn(
        "bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out",
        isMobile
          ? cn("fixed inset-y-0 left-0 z-50 w-72", isOpen ? "translate-x-0" : "-translate-x-full")
          : cn("relative", isOpen ? "w-64" : "w-16"),
      )}
    >
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
        {(isOpen || isMobile) && (
          <Link href="/admin/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="leading-tight">
              <div className="font-semibold text-gray-900 text-sm">Properly Admin</div>
              <div className="text-[11px] text-gray-400">{isFullAdmin ? "Admin" : "Support Admin"}</div>
            </div>
          </Link>
        )}
        {isMobile ? (
          <button onClick={onToggle} className="p-1.5 hover:bg-gray-100 rounded-md transition-colors">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        ) : (
          <button onClick={onToggle} className="p-1.5 hover:bg-gray-100 rounded-md transition-colors ml-auto">
            {isOpen ? <ChevronLeft className="w-4 h-4 text-gray-600" /> : <ChevronRight className="w-4 h-4 text-gray-600" />}
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-2">
        <ul className="space-y-1">
          {items.map((item) => {
            const active = isActive(item.href)
            const showLabels = isOpen || isMobile

            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                    "hover:bg-gray-100 group",
                    active && "bg-[hsl(var(--sidebar-active-bg))] text-[hsl(var(--sidebar-active-fg))]",
                    !active && "text-gray-700",
                  )}
                >
                  <span className={cn(
                    "flex-shrink-0 transition-colors",
                    active ? "text-[hsl(var(--sidebar-active-fg))]" : "text-gray-500 group-hover:text-gray-700",
                  )}>
                    {item.icon}
                  </span>
                  {showLabels && <span className="flex-1 text-left text-sm font-medium truncate">{item.label}</span>}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {(isOpen || isMobile) && (
        <div className="px-4 py-3 border-t border-gray-200">
          <Link href="/dashboard" className="text-xs text-gray-400 hover:text-gray-600">
            ← Back to user portal
          </Link>
        </div>
      )}
    </aside>
  )
}

export default AdminSidebar
