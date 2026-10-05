'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { getSession } from '@/lib/auth';
import { useAuthSync } from '@/hooks/useFormPersistence';

type AuthContextType = {
  user: { email: string; name?: string; uniqueId?: string; role?: string } | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, refreshUser: async () => { } });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<{ email: string; name?: string; uniqueId?: string; role?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = async () => {
    try {
      const session = await getSession();
      setUser(session);
    } catch (err) {
      console.error('Failed to load session:', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  // Sync auth state across tabs
  useAuthSync((isAuthenticated) => {
    if (isAuthenticated) {
      loadUser();
    } else {
      setUser(null);
    }
  });

  const refreshUser = async () => {
    await loadUser();
  };

  return (
    <AuthContext.Provider value={{ user, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  return useContext(AuthContext);
}
