'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileText, Loader2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { usePropertiesSWR } from '@/hooks/usePropertiesSWR';
import {
  getDepreciationSchedules,
  uploadDepreciationSchedule,
  currentFinancialYearEndDate,
  yearForDate,
  type DepreciationSchedule,
} from '@/lib/depreciation';
import DepreciationScheduleModal from './DepreciationScheduleModal';

function formatAmount(value: string | undefined): string {
  const num = parseFloat(value || '0');
  return `$${(Number.isFinite(num) ? num : 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function DepreciationPage() {
  const { properties, isLoading: isLoadingProperties } = usePropertiesSWR();
  const [selectedProperty, setSelectedProperty] = useState('');
  const [schedules, setSchedules] = useState<DepreciationSchedule[]>([]);
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [openSchedule, setOpenSchedule] = useState<DepreciationSchedule | null>(null);

  const loadSchedules = async (propertyId: string) => {
    if (!propertyId) {
      setSchedules([]);
      return;
    }
    setIsLoadingSchedules(true);
    const data = await getDepreciationSchedules(propertyId);
    setSchedules(data);
    setIsLoadingSchedules(false);
  };

  useEffect(() => {
    loadSchedules(selectedProperty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProperty]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !selectedProperty) return;

    setIsUploading(true);
    const result = await uploadDepreciationSchedule(file, selectedProperty);
    setIsUploading(false);

    if (result.success && result.schedule) {
      if (result.schedule.status === 'failed') {
        toast.warning('Uploaded, but nothing could be extracted', {
          description: result.schedule.error_message || 'The PDF was saved, but no depreciation table was recognised in it.',
        });
      } else {
        toast.success('Depreciation schedule uploaded', {
          description: `Extracted ${result.schedule.years.diminishing_value.length} financial year(s).`,
        });
      }
      loadSchedules(selectedProperty);
    } else {
      toast.error('Upload failed', { description: result.error });
    }
  };

  const latest = schedules.find(s => s.status === 'parsed');
  const currentFyDate = currentFinancialYearEndDate();
  const currentFyRow = yearForDate(latest, currentFyDate, 'diminishing_value');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Depreciation Schedule</h1>
          <p className="text-gray-500">Upload a quantity surveyor&apos;s depreciation report to see it broken down by financial year</p>
        </div>
      </div>

      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-[1fr,auto] gap-4 items-end">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">Property</label>
            <Select value={selectedProperty} onValueChange={setSelectedProperty} disabled={isLoadingProperties}>
              <SelectTrigger>
                <SelectValue placeholder="Select a property" />
              </SelectTrigger>
              <SelectContent>
                {properties.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <input
              id="depreciation-file-upload"
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="hidden"
              disabled={!selectedProperty || isUploading}
            />
            <Button
              type="button"
              disabled={!selectedProperty || isUploading}
              onClick={() => document.getElementById('depreciation-file-upload')?.click()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              Upload Depreciation Report
            </Button>
          </div>
        </div>
      </Card>

      {selectedProperty && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-6">
              <p className="text-sm text-gray-500">Uploaded Schedules</p>
              <p className="text-2xl font-bold text-gray-900">{schedules.length}</p>
            </Card>
            <Card className="p-6">
              <p className="text-sm text-gray-500">Division 40 ({currentFyDate})</p>
              <p className="text-2xl font-bold text-gray-900">{formatAmount(currentFyRow?.division_40_amount)}</p>
            </Card>
            <Card className="p-6">
              <p className="text-sm text-gray-500">Division 43 ({currentFyDate})</p>
              <p className="text-2xl font-bold text-gray-900">{formatAmount(currentFyRow?.division_43_amount)}</p>
            </Card>
          </div>

          <Card>
            <div className="px-6 py-4 border-b">
              <h2 className="font-semibold text-gray-900">Uploaded Reports</h2>
            </div>
            {isLoadingSchedules ? (
              <div className="px-6 py-12 text-center text-gray-500">Loading…</div>
            ) : schedules.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No depreciation reports uploaded yet</p>
                <p className="text-gray-400 text-sm">Upload a PDF depreciation schedule for this property to get started</p>
              </div>
            ) : (
              <div className="divide-y">
                {schedules.map(schedule => (
                  <button
                    key={schedule.id}
                    type="button"
                    onClick={() => schedule.status === 'parsed' && setOpenSchedule(schedule)}
                    disabled={schedule.status !== 'parsed'}
                    className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 disabled:hover:bg-transparent disabled:opacity-60"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{schedule.file_name}</p>
                      <p className="text-xs text-gray-500">
                        {schedule.provider || 'Unknown provider'} · Uploaded {new Date(schedule.created_at).toLocaleDateString()}
                        {schedule.status === 'failed' && ' · Could not extract a schedule from this PDF'}
                      </p>
                    </div>
                    {schedule.status === 'parsed' && (
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500">
                          {schedule.years.diminishing_value.length} year(s)
                        </span>
                        <span className="text-blue-600 text-sm font-medium inline-flex items-center gap-1">
                          <Eye size={14} />
                          View
                        </span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </Card>
        </>
      )}

      {openSchedule && (
        <DepreciationScheduleModal schedule={openSchedule} onClose={() => setOpenSchedule(null)} />
      )}
    </div>
  );
}
