"use client";

import React from "react";
import { X } from "lucide-react";
import { menuItems } from "./SidebarLinks";

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentPath?: string;
  onNavigate?: (href: string) => void;
}

const MobileSidebar: React.FC<MobileSidebarProps> = ({
  isOpen,
  onClose,
  currentPath = "/dashboard",
  onNavigate,
}) => {
  const isActiveRoute = (href: string) => {
    if (href === "/dashboard") return currentPath === "/dashboard";
    return currentPath?.startsWith(href);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity duration-300
          ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 left-0 h-full w-64 bg-white shadow-xl border-r z-50
          transform transition-all duration-500 ease-[cubic-bezier(0.19,1,0.22,1)]
          ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b">
          <h1 className="text-blue-500 font-bold text-xl">The Properly.com</h1>

          <button
            className="p-2 rounded-lg hover:bg-gray-100"
            onClick={onClose}
          >
            <X />
          </button>
        </div>

        {/* Menu */}
        <nav className="overflow-y-auto sidebar-scroll p-4 h-full">
          {menuItems.map((item) => {
            const isActive = isActiveRoute(item.href);

            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate?.(item.href);
                  onClose();
                }}
                className={`w-full flex items-center gap-3 rounded-lg px-4 py-3 mb-2 
                  transition-all duration-200
                  ${isActive
                    ? "bg-blue-500 text-white shadow-md"
                    : "text-gray-700 hover:bg-gray-100"}
                `}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </>
  );
};

export default MobileSidebar;