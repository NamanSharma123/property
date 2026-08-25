"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users, Building2, ArrowLeftRight, ScanText, Clock, TrendingUp, TrendingDown,
  UserPlus, Home, FileText, Download, Landmark, CreditCard, Ticket,
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import adminApi, { DashboardData } from "@/lib/adminApi";
import { PageHeader } from "@/app/admin/_components/PageHeader";

// Single accent hue (indigo) for every chart here — each is one series
// (a magnitude-over-time trend), so there's no categorical palette to
// assign; see the dataviz skill's form guidance for "job = magnitude".
const ACCENT = "hsl(var(--primary))";
const GRID = "#f1f5f9";
const AXIS = "#94a3b8";

function StatCard({ icon: Icon, label, value, tone = "indigo" }: {
  icon: React.ElementType; label: string; value: string; tone?: "indigo" | "green" | "amber" | "red";
}) {
  const toneClasses: Record<string, string> = {
    indigo: "bg-[hsl(var(--sidebar-active-bg))] text-primary",
    green: "bg-green-50 text-green-700",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-600",
  };
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${toneClasses[tone]}`}>
        <Icon className="w-4.5 h-4.5" size={18} />
      </div>
      <div className="text-2xl font-semibold tracking-tight text-gray-900 tabular-nums">{value}</div>
      <div className="text-sm text-gray-500 mt-1">{label}</div>
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="h-[180px]">{children}</div>
    </div>
  );
}

function monthLabel(ym: string) {
  const [, m] = ym.split("-");
  return ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(m)];
}

const currency = (n: number) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const activityIcon: Record<string, React.ElementType> = {
  user_registered: UserPlus,
  property_added: Home,
  transaction_edited: ArrowLeftRight,
  ocr_processed: FileText,
  support_ticket_created: Ticket,
};

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await adminApi.getDashboard();
      if (cancelled) return;
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.error || "Failed to load dashboard");
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const exportUsersCsv = async () => {
    const res = await adminApi.users.getAll({ limit: 1000 });
    if (!res.success || !res.data) return;
    const rows = res.data.users;
    const header = "Name,Email,Role,Status,Properties,Transactions,Created\n";
    const body = rows.map(u =>
      [u.name, u.email, u.role, u.accountStatus, u.propertiesCount ?? 0, u.transactionsCount ?? 0, u.createdAt]
        .map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")
    ).join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "properly-users.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !data) {
    return <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">{error || "Failed to load dashboard"}</div>;
  }

  const { cards, charts, recentActivity } = data;

  return (
    <div>
      <PageHeader eyebrow="Overview" title="Admin Dashboard" description="Platform-wide activity across every user's portfolio." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Users} label="Total Users" value={cards.totalUsers.toLocaleString()} />
        <StatCard icon={Users} label="Active Users" value={cards.activeUsers.toLocaleString()} tone="green" />
        <StatCard icon={Users} label="Suspended Users" value={cards.suspendedUsers.toLocaleString()} tone="red" />
        <StatCard icon={Building2} label="Total Properties" value={cards.totalProperties.toLocaleString()} />
        <StatCard icon={ArrowLeftRight} label="Total Transactions" value={cards.totalTransactions.toLocaleString()} />
        <StatCard icon={ScanText} label="OCR Processed Today" value={cards.ocrProcessedToday.toLocaleString()} tone="green" />
        <StatCard icon={Clock} label="OCR Pending Review" value={cards.ocrPendingReview.toLocaleString()} tone="amber" />
        <StatCard icon={TrendingUp} label="Income This Month" value={currency(cards.monthlyIncome)} tone="green" />
        <StatCard icon={Landmark} label="Total Loans" value={cards.totalLoans.toLocaleString()} />
        <StatCard icon={CreditCard} label="Subscription Revenue" value={currency(cards.subscriptionRevenue)} tone="green" />
        <StatCard icon={Ticket} label="Pending Support Tickets" value={cards.pendingSupportTickets.toLocaleString()} tone={cards.pendingSupportTickets > 0 ? "amber" : "indigo"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <ChartCard title="User Registration Trend" subtitle="New signups, last 6 months">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={charts.userRegistrationTrend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="month" tickFormatter={monthLabel} tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} width={28} />
              <Tooltip formatter={(v: number | undefined) => [v ?? 0, "New users"]} labelFormatter={monthLabel} />
              <Line type="monotone" dataKey="count" stroke={ACCENT} strokeWidth={2} dot={{ r: 3, fill: ACCENT }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Transaction Trend" subtitle="Transactions created, last 6 months">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={charts.transactionTrend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="month" tickFormatter={monthLabel} tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} width={28} />
              <Tooltip formatter={(v: number | undefined) => [v ?? 0, "Transactions"]} labelFormatter={monthLabel} />
              <Line type="monotone" dataKey="count" stroke={ACCENT} strokeWidth={2} dot={{ r: 3, fill: ACCENT }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Property Growth" subtitle="Properties added, last 6 months">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={charts.propertyGrowth} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="month" tickFormatter={monthLabel} tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} width={28} />
              <Tooltip formatter={(v: number | undefined) => [v ?? 0, "Properties"]} labelFormatter={monthLabel} />
              <Bar dataKey="count" fill={ACCENT} radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="OCR Success Rate" subtitle="% of uploaded documents completed, last 6 months">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={charts.ocrSuccessRate} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="month" tickFormatter={monthLabel} tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} width={28} />
              <Tooltip formatter={(v: number | undefined) => [`${v ?? 0}%`, "Success rate"]} labelFormatter={monthLabel} />
              <Line type="monotone" dataKey="rate" stroke={ACCENT} strokeWidth={2} dot={{ r: 3, fill: ACCENT }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Recent Activity</h3>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">No activity yet.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentActivity.map((event, i) => {
                const Icon = activityIcon[event.type] || FileText;
                return (
                  <div key={i} className="flex items-center gap-3 py-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[hsl(var(--sidebar-active-bg))] text-primary flex items-center justify-center flex-shrink-0">
                      <Icon size={15} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-gray-800 truncate">{event.title}</div>
                      {event.subtitle && <div className="text-xs text-gray-400 truncate">{event.subtitle}</div>}
                    </div>
                    <div className="text-xs text-gray-400 flex-shrink-0">{timeAgo(event.timestamp)}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h3>
          <div className="space-y-2">
            <Link href="/admin/users" className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
              <UserPlus size={16} /> Manage Users
            </Link>
            <button onClick={exportUsersCsv} className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              <Download size={16} /> Export Users CSV
            </button>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-400">
            <TrendingDown size={12} className="inline mr-1" />
            Expenses this month: {currency(cards.monthlyExpense)}
          </div>
        </div>
      </div>
    </div>
  );
}
