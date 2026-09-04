"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import adminApi, { AdminUser } from "@/lib/adminApi";

/**
 * "Select a user, filter this list down to just them" — used on the
 * Properties/Transactions/Documents/Loans admin tables. A dropdown rather
 * than relying on the free-text search box (which already substring-matches
 * owner name/email server-side) because picking a name off a list is much
 * easier for a non-technical admin than typing it correctly.
 *
 * Loads the user directory once and filters client-side as you type in the
 * dropdown's own search box — fine at this app's current user-count scale;
 * if the user base grows into the thousands this would want to become a
 * server-side-searched combobox instead (see TransferOwnershipDialog for
 * that pattern).
 */
export default function UserFilterSelect({
  value, onChange, className,
}: {
  value: string;
  onChange: (userId: string) => void;
  className?: string;
}) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    adminApi.users.getAll({ limit: 500 }).then((res) => {
      if (res.success && res.data) setUsers(res.data.users);
      setLoading(false);
    });
  }, []);

  const visible = filter.trim()
    ? users.filter((u) =>
        u.name.toLowerCase().includes(filter.toLowerCase()) ||
        u.email.toLowerCase().includes(filter.toLowerCase())
      )
    : users;

  const selected = users.find((u) => u.id === value);

  return (
    <Select
      value={value}
      onValueChange={(v) => { onChange(v); setFilter(""); }}
      onOpenChange={(open) => !open && setFilter("")}
    >
      <SelectTrigger className={className || "w-full sm:w-56"}>
        <SelectValue placeholder={loading ? "Loading users…" : "All users"}>
          {value === "all" || !selected ? "All users" : selected.name}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <div className="sticky top-0 bg-popover px-1 pb-1.5 pt-1 z-10">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              placeholder="Search users…"
              className="h-8 pl-7 text-xs"
            />
          </div>
        </div>
        <SelectItem value="all">All users</SelectItem>
        {visible.map((u) => (
          <SelectItem key={u.id} value={u.id}>
            {u.name} <span className="text-gray-400">— {u.email}</span>
          </SelectItem>
        ))}
        {!loading && visible.length === 0 && (
          <div className="px-2 py-3 text-xs text-gray-400 text-center">No users match</div>
        )}
      </SelectContent>
    </Select>
  );
}
