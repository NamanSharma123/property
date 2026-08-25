"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Search, Eye, Ban, CheckCircle2, Trash2, KeyRound, ChevronLeft, ChevronRight, Copy } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import adminApi, { AdminUser } from "@/lib/adminApi";
import { PageHeader } from "@/app/admin/_components/PageHeader";

const statusTone: Record<string, string> = {
  active: "bg-green-50 text-green-700 border-green-200",
  suspended: "bg-red-50 text-red-600 border-red-200",
  locked: "bg-amber-50 text-amber-600 border-amber-200",
};

export default function UsersTable({ isFullAdmin }: { isFullAdmin: boolean }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await adminApi.users.getAll({
      search: search || undefined,
      status: status === "all" ? undefined : status,
      page,
      limit: 20,
    });
    if (res.success && res.data) {
      setUsers(res.data.users);
      setPages(res.data.pagination.pages || 1);
      setTotal(res.data.pagination.total);
    } else {
      toast.error(res.error || "Failed to load users");
    }
    setLoading(false);
  }, [search, status, page]);

  // Debounce search — reset to page 1 whenever the query/filter changes.
  useEffect(() => {
    const handle = setTimeout(() => {
      setPage(1);
    }, 350);
    return () => clearTimeout(handle);
  }, [search, status]);

  useEffect(() => { load(); }, [load]);

  const withBusy = async (id: string, fn: () => Promise<void>) => {
    setBusyId(id);
    try {
      await fn();
    } finally {
      setBusyId(null);
    }
  };

  const toggleStatus = (user: AdminUser) => withBusy(user.id, async () => {
    const res = user.accountStatus === "active" ? await adminApi.users.suspend(user.id) : await adminApi.users.activate(user.id);
    if (res.success) {
      toast.success(res.message || "User updated");
      load();
    } else {
      toast.error(res.error || "Action failed");
    }
  });

  const resetPassword = (user: AdminUser) => withBusy(user.id, async () => {
    const res = await adminApi.users.resetPassword(user.id);
    if (res.success) toast.success(res.message || "Reset email sent");
    else toast.error(res.error || "Could not send reset email");
  });

  const deleteUser = (user: AdminUser) => withBusy(user.id, async () => {
    const res = await adminApi.users.remove(user.id);
    if (res.success) {
      toast.success("User deleted");
      load();
    } else {
      toast.error(res.error || "Could not delete user");
    }
  });

  const copyInboundEmail = (email: string | null) => {
    if (!email) return;
    navigator.clipboard.writeText(email);
    toast.success("Copied");
  };

  return (
    <div>
      <PageHeader eyebrow="Admin" title="Users" description="Search and manage every user on the platform." />

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, phone, inbox ID, address…"
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="locked">Locked</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Inbound OCR email</TableHead>
                <TableHead className="text-right">Properties</TableHead>
                <TableHead className="text-right">Transactions</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last login</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-10 text-gray-400">Loading…</TableCell></TableRow>
              ) : users.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-10 text-gray-400">No users match.</TableCell></TableRow>
              ) : users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[hsl(var(--sidebar-active-bg))] text-primary flex items-center justify-center text-xs font-semibold flex-shrink-0">
                        {user.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{user.name}</div>
                        <div className="text-xs text-gray-400 truncate">{user.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => copyInboundEmail(user.inboundEmail)}
                      className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-primary"
                      title="Copy"
                    >
                      <span className="truncate max-w-[160px]">{user.inboundEmail || "—"}</span>
                      {user.inboundEmail && <Copy size={12} />}
                    </button>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">{user.propertiesCount ?? 0}</TableCell>
                  <TableCell className="text-right tabular-nums text-sm">{user.transactionsCount ?? 0}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusTone[user.accountStatus] || ""}>
                      {user.accountStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-gray-500">
                    {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : "Never"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/admin/users/${user.id}`} className="p-1.5 rounded-md text-gray-400 hover:text-primary hover:bg-gray-50" title="View">
                        <Eye size={16} />
                      </Link>
                      <button
                        disabled={busyId === user.id}
                        onClick={() => toggleStatus(user)}
                        className="p-1.5 rounded-md text-gray-400 hover:text-primary hover:bg-gray-50 disabled:opacity-40"
                        title={user.accountStatus === "active" ? "Suspend" : "Activate"}
                      >
                        {user.accountStatus === "active" ? <Ban size={16} /> : <CheckCircle2 size={16} />}
                      </button>
                      {isFullAdmin && (
                        <>
                          <button
                            disabled={busyId === user.id}
                            onClick={() => resetPassword(user)}
                            className="p-1.5 rounded-md text-gray-400 hover:text-primary hover:bg-gray-50 disabled:opacity-40"
                            title="Reset password"
                          >
                            <KeyRound size={16} />
                          </button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button
                                disabled={busyId === user.id}
                                className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-40"
                                title="Delete"
                              >
                                <Trash2 size={16} />
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
                                <AlertDialogAction
                                  className="bg-red-600 hover:bg-red-700"
                                  onClick={() => deleteUser(user)}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
          <span>{total} user{total === 1 ? "" : "s"}</span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-md border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="tabular-nums text-xs">{page} / {pages}</span>
            <button
              disabled={page >= pages}
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              className="p-1.5 rounded-md border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
