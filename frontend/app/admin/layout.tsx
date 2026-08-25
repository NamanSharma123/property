"use client";

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AdminSidebar } from '@/app/admin/_components/Layout/AdminSidebar';
import AdminTopBar from '@/app/admin/_components/Layout/AdminTopBar';
import { getSession } from '@/lib/auth';
import { Toaster } from '@/components/ui/sonner';
import { SWRProvider } from '@/components/providers/swr-provider';
import { AdminSessionContext, AdminSession } from '@/app/admin/_components/AdminSessionContext';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === '/admin/login';

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [session, setSession] = useState<AdminSession | null>(null);
  const [loading, setLoading] = useState(!isLoginPage);

  useEffect(() => {
    if (isLoginPage) return;

    const checkSession = async () => {
      try {
        const sessionData = await getSession();
        if (!sessionData || (sessionData.role !== 'admin' && sessionData.role !== 'manager')) {
          router.push('/admin/login');
          return;
        }
        setSession(sessionData);
      } catch (error) {
        console.error('Admin session check failed', error);
        router.push('/admin/login');
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, [isLoginPage, router]);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      setSidebarOpen(!mobile);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // The login page renders its own full-page layout, no sidebar/shell.
  if (isLoginPage) {
    return <div data-admin-theme>{children}</div>;
  }

  if (loading) {
    return (
      <div data-admin-theme className="flex h-screen items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!session) {
    return null; // redirecting
  }

  const isFullAdmin = session.role === 'admin';

  return (
    <div data-admin-theme>
      <AdminSessionContext.Provider value={session}>
        <SWRProvider>
          <div className="flex h-screen bg-gray-50">
            {isMobile && sidebarOpen && (
              <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
            )}

            <AdminSidebar
              isOpen={sidebarOpen}
              onToggle={() => setSidebarOpen(!sidebarOpen)}
              isMobile={isMobile}
              isFullAdmin={isFullAdmin}
            />

            <div className="flex-1 flex flex-col overflow-hidden">
              <AdminTopBar
                onMenuClick={() => setSidebarOpen(!sidebarOpen)}
                userName={session.name}
                userEmail={session.email}
                isFullAdmin={isFullAdmin}
              />
              <main className="flex-1 overflow-y-auto p-4 sm:p-6">
                {children}
              </main>
            </div>

            <Toaster position="bottom-right" richColors />
          </div>
        </SWRProvider>
      </AdminSessionContext.Provider>
    </div>
  );
}
