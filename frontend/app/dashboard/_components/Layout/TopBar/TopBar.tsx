"use client";

import React, { useState } from 'react';
import { Menu, Copy, HelpCircle, Bell, ChevronDown, LogOut, User, Settings, LayoutDashboard, Loader2 } from 'lucide-react';
import { logout } from '@/lib/auth';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useNotificationsSWR } from '@/hooks/useNotificationsSWR';

interface TopBarProps {
  onMenuClick?: () => void;
  userName?: string;
  userRole?: string;
  userEmail?: string;
  uniqueId?: string;
  /** The unique OCR inbound-email alias (see the "Unique Email ID" spec) —
   *  what a user actually forwards statements/receipts to. This is what
   *  the top badge shows, since it's the thing users need to copy/use day
   *  to day; uniqueId (the internal STA-xxxx reference) is secondary. */
  inboundEmail?: string;
}

const TopBar: React.FC<TopBarProps> = ({
  onMenuClick,
  userName = 'John Doe',
  userRole = 'Property Investor',
  userEmail = 'john.doe@email.com',
  uniqueId = 'ID-0000',
  inboundEmail,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } = useNotificationsSWR();

  const badgeValue = inboundEmail || uniqueId;
  const badgeLabel = inboundEmail ? 'OCR Email' : 'Unique ID';
  const displayUniqueId = `${badgeLabel} : ${badgeValue}`;
  const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase();

  const copyToClipboard = () => {
    navigator.clipboard.writeText(badgeValue);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      // Property related
      case 'property': return '🏠';
      case 'property_added': return '🏠';
      case 'property_updated': return '✏️';
      case 'property_deleted': return '🗑️';

      // Transaction related
      case 'transaction': return '💰';
      case 'transaction_added': return '💵';
      case 'income': return '💰';
      case 'expense': return '💸';

      // OCR related
      case 'ocr': return '📄';
      case 'ocr_complete': return '✅';
      case 'ocr_failed': return '❌';

      // Bank related
      case 'bank': return '🏦';
      case 'bank_connected': return '🔗';

      // Document related
      case 'document': return '📎';
      case 'document_uploaded': return '📤';

      // Security related
      case 'security': return '🔒';
      case 'login': return '🔐';
      case 'password_changed': return '🔑';

      // Subscription related
      case 'subscription': return '⭐';
      case 'subscription_expired': return '⚠️';
      case 'subscription_renewed': return '🎉';

      // Tax & Reports
      case 'tax': return '📊';
      case 'report': return '📈';
      case 'depreciation': return '📉';

      // System alerts
      case 'system': return '⚙️';
      case 'alert': return '🔔';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      case 'success': return '✅';
      case 'info': return 'ℹ️';

      // Welcome & Onboarding
      case 'welcome': return '👋';
      case 'reminder': return '⏰';

      default: return '📢';
    }
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const handleNotificationClick = async (id: string) => {
    await markAsRead(id);
  };

  return (
    <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6">
      {/* Left Section */}
      <div className="flex items-center gap-4">
        {/* Mobile Menu Button */}
        <button
          onClick={onMenuClick}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors md:hidden"
          aria-label="Open menu"
        >
          <Menu size={20} className="text-gray-600" />
        </button>

        <div className="hidden sm:flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-lg">
          <span className="text-sm text-gray-600">{displayUniqueId}</span>
          <button
            onClick={copyToClipboard}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
            aria-label="Copy ID"
          >
            <Copy size={16} className="text-gray-500" />
          </button>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Help Button */}
        <Link href="/dashboard/tickets">
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <HelpCircle size={20} className="text-gray-600" />
          </button>
        </Link>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Bell size={20} className="text-gray-600" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown */}
          {showNotifications && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setShowNotifications(false)}
              />
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                  <p className="text-sm font-semibold text-gray-900">Notifications</p>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {isLoading ? (
                    <div className="px-4 py-8 text-center">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-400" />
                      <p className="text-xs text-gray-500 mt-2">Loading...</p>
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <Bell className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                      <p className="text-sm text-gray-500">No notifications yet</p>
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification.id)}
                        className={`px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 ${!notification.is_read ? 'bg-blue-50/50' : ''
                          }`}
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{notification.message}</p>
                            <p className="text-xs text-gray-400 mt-2">{formatTimeAgo(notification.created_at)}</p>
                          </div>
                          {!notification.is_read && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5"></span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="px-4 py-2 border-t border-gray-100 text-center">
                  <Link href="/dashboard/notifications" className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                    View all notifications
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>

        {/* User Profile */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-3 hover:bg-gray-50 rounded-lg p-1.5 transition-colors"
          >
            <Avatar className="w-9 h-9">
              <AvatarImage src="" />
              <AvatarFallback className="bg-blue-100 text-blue-600 text-sm font-semibold">{initials}</AvatarFallback>
            </Avatar>
            <div className="text-left hidden lg:block">
              <div className="text-sm font-semibold text-gray-900">{userName}</div>
              <div className="text-xs text-gray-500">{userRole}</div>
            </div>
            <ChevronDown size={16} className="text-gray-400 hidden lg:block" />
          </button>

          {/* Dropdown Menu */}
          {showUserMenu && (
            <>
              {/* Backdrop for mobile */}
              <div
                className="fixed inset-0 z-30"
                onClick={() => setShowUserMenu(false)}
              />

              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-900">{userName}</p>
                  <p className="text-xs text-gray-500 truncate">{userEmail}</p>
                </div>

                <div className="py-1">
                  <Link href="/dashboard" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                    <LayoutDashboard className="w-4 h-4 mr-2" />
                    Dashboard
                  </Link>
                  <Link href="/dashboard/profile" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                    <User className="w-4 h-4 mr-2" />
                    My Profile
                  </Link>
                  <Link href="/dashboard/profile/settings" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Link>
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

export default TopBar;