"use client"

import { cn } from "@/lib/utils"
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { menuItems } from "./SidebarLinks"

interface ResponsiveSidebarProps {
  isOpen: boolean
  onToggle: () => void
  isMobile?: boolean
}

export function ResponsiveSidebar({ isOpen, onToggle, isMobile }: ResponsiveSidebarProps) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === "/dashboard" && pathname === "/dashboard") return true
    if (href !== "/dashboard" && pathname?.startsWith(href)) return true
    return false
  }

  return (
    <aside
      className={cn(
        "bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out",
        isMobile
          ? cn("fixed inset-y-0 left-0 z-50 w-72", isOpen ? "translate-x-0" : "-translate-x-full")
          : cn("relative", isOpen ? "w-64" : "w-16"),
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
        {(isOpen || isMobile) && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-gray-900">Properly</span>
          </Link>
        )}
        {isMobile ? (
          <button onClick={onToggle} className="p-1.5 hover:bg-gray-100 rounded-md transition-colors">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        ) : (
          <button onClick={onToggle} className="p-1.5 hover:bg-gray-100 rounded-md transition-colors ml-auto">
            {isOpen ? (
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-600" />
            )}
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            // const Icon = item.icon // item.icon is a ReactNode in SidebarLinks, not a component
            // We need to render it directly
            const active = isActive(item.href)
            const showLabels = isOpen || isMobile

            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                    "hover:bg-gray-100 group",
                    active && "bg-blue-50 text-blue-600",
                    !active && "text-gray-700",
                  )}
                >
                  <span className={cn(
                    "flex-shrink-0 transition-colors",
                    active ? "text-blue-600" : "text-gray-500 group-hover:text-gray-700",
                  )}>
                    {item.icon}
                  </span>

                  {showLabels && (
                    <span className="flex-1 text-left text-sm font-medium truncate">{item.label}</span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}

export default ResponsiveSidebar;