import { ReactNode } from "react";
import { AuthProvider } from "@/app/auth/AuthProvider";
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <AuthProvider>
        {children}
      </AuthProvider>
    </div>
  );
}
