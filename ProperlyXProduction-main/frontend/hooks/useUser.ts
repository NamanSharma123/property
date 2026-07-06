'use client';

import { useState, useEffect } from 'react';
import { authApi, User, onAuthStateChange, getAccessToken } from '@/lib/api';

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const fetchUser = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Check if we have an access token
      if (!getAccessToken()) {
        // Try to initialize from refresh token
        const initialized = await authApi.initializeFromRefreshToken();
        if (!initialized) {
          setUser(null);
          setIsAuthenticated(false);
          return;
        }
      }

      const response = await authApi.getMe();

      if (response.success && response.data?.user) {
        setUser(response.data.user);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
        if (response.error) setError(response.error);
      }
    } catch (err) {
      setError('Failed to fetch user');
      setUser(null);
      setIsAuthenticated(false);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();

    // Subscribe to auth state changes
    const unsubscribe = onAuthStateChange((authenticated) => {
      if (authenticated) {
        fetchUser();
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await authApi.login(email, password);

      if (response.success && response.data?.user) {
        setUser(response.data.user);
        setIsAuthenticated(true);
        return { success: true };
      }

      setError(response.error || 'Login failed');
      return { success: false, error: response.error || 'Invalid credentials' };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      console.error(err);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (name: string, email: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await authApi.signup(name, email, password);

      if (response.success && response.data?.user) {
        setUser(response.data.user);
        setIsAuthenticated(true);
        return { success: true };
      }

      setError(response.error || 'Signup failed');
      return { success: false, error: response.error || 'Signup failed' };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Signup failed';
      setError(errorMessage);
      console.error(err);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await authApi.logout();
      setUser(null);
      setIsAuthenticated(false);
    } catch (err) {
      setError('Failed to logout');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = () => {
    fetchUser();
  };

  return {
    user,
    isLoading,
    error,
    isAuthenticated,
    login,
    signup,
    logout,
    refreshUser,
  };
}