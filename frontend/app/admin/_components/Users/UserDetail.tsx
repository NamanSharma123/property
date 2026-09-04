"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Copy, Ban, CheckCircle2, KeyRound, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import adminApi, { AdminUser } from "@/lib/adminApi";
import PropertiesTab from "./tabs/PropertiesTab";
import TransactionsTab from "./tabs/TransactionsTab";
import DocumentsTab from "./tabs/DocumentsTab";
import LoansTab from "./tabs/LoansTab";
import SupportTab from "./tabs/SupportTab";
import ActivityTab from "./tabs/ActivityTab";

const statusTone: Record<string, string> = {
  active: "bg-green-50 text-green-700 border-green-200",
  suspended: "bg-red-50 text-red-600 border-red-200",
  locked: "bg-amber-50 text-amber-600 border-amber-200",
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-gray-400">{label}</div>
      <div className="text-sm text-gray-800 mt-0.5">{value}</div>
    </div>
  );
}

export default function UserDetail({ userId, isFullAdmin }: { userId: string; isFullAdmin: boolean }) {
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const res = await adminApi.users.getOne(userId);
    if (res.success && res.data) {
      setUser(res.data.user);
    } else {
      toast.error(res.error || "User not found");
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleStatus = async () => {
    if (!user) return;
    setBusy(true);
    const res = user.accountStatus === "active" ? await adminApi.users.suspend(user.id) : await adminApi.users.activate(user.id);
    if (res.success) {
      toast.success(res.message || "Updated");
      load();
    } else {
      toast.error(res.error || "Action failed");
    }
    setBusy(false);
  };

  const resetPassword = async () => {
    if (!user) return;
    setBusy(true);
    const res = await adminApi.users.resetPassword(user.id);
    if (res.success) toast.success(res.message || "Reset email sent");
    else toast.error(res.error || "Could not send reset email");
    setBusy(false);
  };

  const deleteUser = async () => {
    if (!user) return;
    setBusy(true);
    const res = await adminApi.users.remove(user.id);
    setBusy(false);
    if (res.success) {
      toast.success("User deleted");
      router.push("/admin/users");
    } else {
      toast.error(res.error || "Could not delete user");
    }
  };

  const copyInboundEmail = () => {
    if (!user?.inboundEmail) return;
    navigator.clipboard.writeText(user.inboundEmail);
    toast.success("Copied");
  };

  if (loading) return <div className="py-16 text-center text-gray-400 text-sm">Loading…</div>;
  if (!user) return <div className="py-16 text-center text-gray-400 text-sm">User not found.</div>;

  return (
    <div>
      <Link href="/admin/users" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary mb-4">
        <ArrowLeft size={14} /> Back to users
      </Link>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 mb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 rounded-full bg-[hsl(var(--sidebar-active-bg))] text-primary flex items-center justify-center text-base font-semibold flex-shrink-0">
              {user.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-900 truncate">{user.name}</h2>
                <Badge variant="outline" className={statusTone[user.accountStatus] || ""}>{user.accountStatus}</Badge>
              </div>
              <div className="text-sm text-gray-500 truncate">{user.email}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              disabled={busy}
              onClick={toggleStatus}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {user.accountStatus === "active" ? <Ban size={14} /> : <CheckCircle2 size={14} />}
              {user.accountStatus === "active" ? "Suspend" : "Activate"}
            </button>
            {isFullAdmin && (
              <>
                <button
                  disabled={busy}
                  onClick={resetPassword}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  <KeyRound size={14} /> Reset password
                </button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button disabled={busy} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50">
                      <Trash2 size={14} /> Delete
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete {user.name}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This permanently deletes the user and everything owned by them
                        (properties, transactions, documents). This cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={deleteUser}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        </div>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="mb-4 flex-wrap h-auto">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="properties">Properties ({user.propertiesCount ?? 0})</TabsTrigger>
          <TabsTrigger value="transactions">Transactions ({user.transactionsCount ?? 0})</TabsTrigger>
          <TabsTrigger value="documents">Documents ({user.documentsCount ?? 0})</TabsTrigger>
          <TabsTrigger value="loans">Loans</TabsTrigger>
          <TabsTrigger value="support">Support</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
          <TabsContent value="profile" className="mt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="Name" value={user.name} />
              <Field label="Email" value={user.email} />
              <Field label="Phone" value={user.phone || "—"} />
              <Field label="Role" value={<span className="capitalize">{user.role}</span>} />
              <Field
                label="Unique OCR inbox email"
                value={
                  <button onClick={copyInboundEmail} className="inline-flex items-center gap-1.5 hover:text-primary">
                    {user.inboundEmail || "—"} {user.inboundEmail && <Copy size={13} />}
                  </button>
                }
              />
              <Field label="User ID" value={<span className="text-xs font-mono">{user.uniqueId}</span>} />
              <Field label="Created" value={new Date(user.createdAt).toLocaleString()} />
              <Field label="Last login" value={user.lastLogin ? new Date(user.lastLogin).toLocaleString() : "Never"} />
              <Field label="Email verified" value={user.isEmailVerified ? "Yes" : "No"} />
            </div>
          </TabsContent>

          <TabsContent value="properties" className="mt-0"><PropertiesTab userId={userId} /></TabsContent>
          <TabsContent value="transactions" className="mt-0"><TransactionsTab userId={userId} /></TabsContent>
          <TabsContent value="documents" className="mt-0"><DocumentsTab userId={userId} /></TabsContent>
          <TabsContent value="loans" className="mt-0"><LoansTab userId={userId} /></TabsContent>
          <TabsContent value="support" className="mt-0"><SupportTab userId={userId} /></TabsContent>
          <TabsContent value="activity" className="mt-0"><ActivityTab userId={userId} /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
