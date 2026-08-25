"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, XCircle } from "lucide-react";
import adminApi, { ActivityLogEntry } from "@/lib/adminApi";
import EmptyTab from "./EmptyTab";

function browserFrom(userAgent: string | null) {
  if (!userAgent) return "—";
  const match = userAgent.match(/(Chrome|Firefox|Safari|Edge)\/[\d.]+/);
  return match ? match[0].replace("/", " ") : userAgent.slice(0, 40);
}

export default function ActivityTab({ userId }: { userId: string }) {
  const [rows, setRows] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await adminApi.users.getActivity(userId, { limit: 50 });
      if (cancelled) return;
      if (res.success && res.data) {
        setRows(res.data.activity);
      } else {
        toast.error(res.error || "Failed to load activity");
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  if (loading) return <div className="py-10 text-center text-gray-400 text-sm">Loading…</div>;
  if (rows.length === 0) return <EmptyTab title="No activity yet" note="Login history and account actions will show up here." />;

  return (
    <div className="divide-y divide-gray-100">
      {rows.map((entry) => (
        <div key={entry.id} className="flex items-start gap-3 py-3">
          {entry.success
            ? <CheckCircle2 size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
            : <XCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />}
          <div className="min-w-0 flex-1">
            <div className="text-sm text-gray-800">
              {entry.action.replace(/_/g, " ")}
              {entry.description && <span className="text-gray-400"> — {entry.description}</span>}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">
              {entry.ip_address || "—"} · {browserFrom(entry.user_agent)}
            </div>
          </div>
          <div className="text-xs text-gray-400 whitespace-nowrap">
            {new Date(entry.created_at).toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
}
