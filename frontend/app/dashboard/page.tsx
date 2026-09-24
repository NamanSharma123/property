'use client';

import Dashboard from '@/app/dashboard/_components/dashboard/dashboard';
import { useEffect, useState } from 'react';
import { getSession } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<{ email: string; name: string; uniqueId: string; inboundEmail?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const sessionData = await getSession();
        if (!sessionData) {
          router.push('/auth/login');
        } else {
          setSession(sessionData);
        }
      } catch (error) {
        console.error('Session error:', error);
        router.push('/auth/login');
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div>
      <Dashboard
        userName={session.name}
        inboundEmail={session.inboundEmail}
      />
    </div>
  );
}
