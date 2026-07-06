"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { menuItems } from "./SidebarLinks";

interface DesktopSidebarProps {
  currentPath?: string;
  onNavigate?: (href: string) => void;
}

const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  currentPath = "/dashboard",
  onNavigate,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isActiveRoute = (href: string) => {
    if (href === "/dashboard") return currentPath === "/dashboard";
    return currentPath?.startsWith(href);
  };

  return (
    <aside
      className={`h-screen bg-white border-r shadow-[4px_0_10px_rgba(0,0,0,0.04)]
        flex flex-col transition-all duration-300 ease-in-out
        ${isCollapsed ? "w-20" : "w-64"}`}
    >
      {/* Header */}
      <div className="h-16 sticky top-0 z-20 bg-white border-b p-4 flex items-center gap-3">
        {!isCollapsed ? (
          <h1 className="text-blue-500 font-bold text-xl">TheProperly.com</h1>
        ) : (
          <h1 className="text-blue-500 font-extrabold text-2xl">P</h1>
        )}

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="ml-auto p-1 rounded-lg hover:bg-gray-100 transition-all"
        >
          {isCollapsed ? <ChevronRight /> : <ChevronLeft />}
        </button>
      </div>

      {/* Scrollable Menu */}
      <div className="relative flex-1 overflow-hidden">
        <nav className="h-full overflow-y-auto sidebar-scroll px-3 py-4">
          {menuItems.map((item) => {
            const isActive = isActiveRoute(item.href);

            return (
              <button
                key={item.id}
                onClick={() => onNavigate?.(item.href)}
                className={`
                  flex items-center gap-3 w-full rounded-lg px-4 py-3 mb-2
                  transition-all duration-200
                  ${isActive
                    ? "bg-blue-500 text-white shadow-md"
                    : "text-gray-700 hover:bg-gray-100"}
                  ${isCollapsed ? "justify-center px-0" : ""}
                `}
              >
                <span>{item.icon}</span>

                {!isCollapsed && (
                  <span
                    className="transition-opacity duration-300"
                  >
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Fade effect */}
        <div className="pointer-events-none absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-white to-transparent"></div>
      </div>
    </aside>
  );
};

export default DesktopSidebar;