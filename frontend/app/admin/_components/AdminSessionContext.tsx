"use client";

import { createContext, useContext } from "react";

export interface AdminSession {
  id: string;
  email: string;
  name: string;
  role: string; // 'admin' | 'manager'
}

export const AdminSessionContext = createContext<AdminSession | null>(null);

/** Role/session for the current admin-panel user. Only usable inside
 * app/admin/layout.tsx's subtree, where the provider is always mounted
 * after the auth gate resolves — so a null here inside /admin means a
 * page rendered outside that gate (shouldn't happen via normal routing). */
export function useAdminSession(): AdminSession {
  const ctx = useContext(AdminSessionContext);
  if (!ctx) {
    throw new Error("useAdminSession() must be used within the /admin layout");
  }
  return ctx;
}

export function useIsFullAdmin(): boolean {
  return useAdminSession().role === "admin";
}
