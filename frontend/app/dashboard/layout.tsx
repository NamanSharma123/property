"use client";

import { useState, useEffect } from 'react';
import { ResponsiveSidebar } from "@/app/dashboard/_components/Layout/SideBar/ResponsiveSidebar"
import TopBar from "@/app/dashboard/_components/Layout/TopBar/TopBar";
import { getSession } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { Toaster } from '@/components/ui/sonner';
import { SWRProvider } from '@/components/providers/swr-provider';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [session, setSession] = useState<{ email: string; name?: string; uniqueId?: string; inboundEmail?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const sessionData = await getSession();
        if (!sessionData) {
          router.push('/auth/login');
        } else {
          setSession(sessionData);
        }
      } catch (error) {
        console.error("Failed to fetch session", error);
        router.push('/auth/login');
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [router]);

  // Keep backend alive - ping every 10 minutes to prevent Render spin-down
  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

    const pingBackend = async () => {
      try {
        await fetch(`${API_URL}/health`, { method: 'HEAD' });
      } catch {
        // Silent fail - just keeping alive
      }
    };

    // Ping immediately on dashboard load
    pingBackend();

    // Then ping every 10 minutes
    const interval = setInterval(pingBackend, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (!session) {
    return null; // Will redirect
  }

  return (
    <SWRProvider>
      <div className="flex h-screen bg-gray-50">
        {/* Mobile Overlay */}
        {isMobile && sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Responsive Sidebar */}
        <ResponsiveSidebar
          isOpen={sidebarOpen}
          onToggle={handleSidebarToggle}
          isMobile={isMobile}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Bar */}
          <TopBar
            onMenuClick={handleSidebarToggle}
            userName={session.name}
            userEmail={session.email}
            uniqueId={session.uniqueId}
            inboundEmail={session.inboundEmail}
          />

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6">
            {children}
          </main>
        </div>

        {/* Toast notifications */}
        <Toaster position="bottom-right" richColors />
      </div>
    </SWRProvider>
  );
}
