"use client";

import React, { useState } from 'react';
import { Menu, ChevronDown, LogOut, User as UserIcon } from 'lucide-react';
import { logout } from '@/lib/auth';
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface AdminTopBarProps {
  onMenuClick?: () => void;
  userName: string;
  userEmail: string;
  isFullAdmin: boolean;
}

const AdminTopBar: React.FC<AdminTopBarProps> = ({ onMenuClick, userName, userEmail, isFullAdmin }) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase() || 'A';

  return (
    <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6">
      <div className="flex items-center gap-4 min-w-0">
        <button
          onClick={onMenuClick}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors lg:hidden"
          aria-label="Open menu"
        >
          <Menu size={20} className="text-gray-600" />
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-3 hover:bg-gray-50 rounded-lg p-1.5 transition-colors"
          >
            <Avatar className="w-9 h-9">
              <AvatarFallback className="bg-[hsl(var(--sidebar-active-bg))] text-primary text-sm font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="text-left hidden lg:block">
              <div className="text-sm font-semibold text-gray-900">{userName}</div>
              <div className="text-xs text-gray-500">{isFullAdmin ? 'Admin' : 'Support Admin'}</div>
            </div>
            <ChevronDown size={16} className="text-gray-400 hidden lg:block" />
          </button>

          {showUserMenu && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowUserMenu(false)} />
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                    <UserIcon className="w-3.5 h-3.5" /> {userName}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{userEmail}</p>
                </div>
                <div className="border-t border-gray-100 mt-1 pt-1">
                  <form action={logout}>
                    <button type="submit" className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-gray-50 transition-colors">
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </button>
                  </form>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminTopBar;
