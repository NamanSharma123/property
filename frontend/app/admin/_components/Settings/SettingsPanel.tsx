"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Upload, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import adminApi, { IntegrationStatus, PlatformSettings } from "@/lib/adminApi";
import { documentsApi } from "@/lib/api";
import { PageHeader } from "@/app/admin/_components/PageHeader";

export default function SettingsPanel() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const res = await adminApi.settings.get();
    if (res.success && res.data) {
      setSettings(res.data.settings);
      setIntegrations(res.data.integrations);
    } else {
      toast.error(res.error || "Failed to load settings");
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const update = (key: keyof PlatformSettings, value: string) => {
    setSettings((prev) => prev ? { ...prev, [key]: value } : prev);
  };

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    const res = await adminApi.settings.update(settings);
    setSaving(false);
    if (res.success) toast.success("Settings saved");
    else toast.error(res.error || "Save failed");
  };

  const uploadLogo = async (file: File) => {
    setUploading(true);
    const res = await documentsApi.upload(file);
    setUploading(false);
    if (res.success && res.data) {
      update("logo_url", res.data.url);
      toast.success("Logo uploaded — remember to Save");
    } else {
      toast.error(res.error || "Upload failed");
    }
  };

  if (loading || !settings) return <div className="py-16 text-center text-gray-400 text-sm">Loading…</div>;

  return (
    <div>
      <PageHeader eyebrow="Admin" title="Settings" description="Platform branding and integration status." />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Company branding</h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Company name</label>
              <Input value={settings.company_name} onChange={(e) => update("company_name", e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Support email</label>
              <Input value={settings.support_email} onChange={(e) => update("support_email", e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Theme accent color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={settings.theme_accent_color}
                  onChange={(e) => update("theme_accent_color", e.target.value)}
                  className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"
                />
                <Input value={settings.theme_accent_color} onChange={(e) => update("theme_accent_color", e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Logo</label>
              <div className="flex items-center gap-3">
                {settings.logo_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={settings.logo_url} alt="Logo" className="w-10 h-10 rounded-lg object-cover border border-gray-200" />
                )}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
                <button
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  <Upload size={14} /> {uploading ? "Uploading…" : "Upload logo"}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Default trial length (days)</label>
              <Input type="number" value={settings.default_trial_days} onChange={(e) => update("default_trial_days", e.target.value)} />
            </div>
            <button disabled={saving} onClick={save} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40">
              <Save size={14} /> {saving ? "Saving…" : "Save settings"}
            </button>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Integration status</h3>
          <p className="text-xs text-gray-400 mb-4">
            API keys and credentials are configured via environment variables / deployment secrets, not
            editable here — this is a status check only, nothing sensitive is shown.
          </p>
          <div className="space-y-2">
            {integrations.map((i) => (
              <div key={i.key} className="flex items-start gap-3 px-3 py-2.5 rounded-lg border border-gray-100">
                {i.configured ? <CheckCircle2 size={16} className="text-green-500 mt-0.5 flex-shrink-0" /> : <XCircle size={16} className="text-gray-300 mt-0.5 flex-shrink-0" />}
                <div className="min-w-0">
                  <div className="text-sm text-gray-800">{i.label}</div>
                  <div className="text-xs text-gray-400">{i.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
