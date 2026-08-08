"use client";

import React, { useState } from "react";

import { Property, getUnitLabelsForProperty } from "@/lib/property";
import { getTransactionsInRange } from "@/lib/transaction";
import { getDepreciationSchedules, type DepreciationSchedule } from "@/lib/depreciation";
import {
  buildAllPropertiesReport,
  buildIndividualPropertyReport,
  buildUnitWiseReport,
  financialYearPeriod,
  customDatePeriod,
  monthPeriod,
  getRecentFinancialYearLabels,
  type ReportData,
  type ReportPeriod,
  type ReportKind,
} from "@/lib/reports";

/** Fetches every property's depreciation schedules in parallel, keyed by propertyId — for buildAllPropertiesReport's per-column "Depreciation (from Schedule)" lookup. */
async function fetchDepreciationSchedulesByProperty(propertyIds: string[]): Promise<Record<string, DepreciationSchedule[]>> {
  const entries = await Promise.all(
    propertyIds.map(async (id) => [id, await getDepreciationSchedules(id)] as const)
  );
  return Object.fromEntries(entries);
}

interface GenerateReportsProps {
  reportType: string;
  setReportType: (type: string) => void;
  reportScope: string;
  setReportScope: (scope: string) => void;
  property: string;
  setProperty: (property: string) => void;
  duration: string;
  setDuration: (duration: string) => void;
  year: string;
  setYear: (year: string) => void;
  customFromDate: string;
  setCustomFromDate: (date: string) => void;
  customToDate: string;
  setCustomToDate: (date: string) => void;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  reportTypeTabs: { id: string; label: string }[];
  years: string[];
  properties: Property[];
  onReportGenerated: (report: ReportData | null, showOwnership?: boolean) => void;
  onGenerateLoanSummary: () => void;
}

export default function GenerateReports({
  reportType,
  setReportType,
  reportScope,
  setReportScope,
  property,
  setProperty,
  duration,
  setDuration,
  year,
  setYear,
  customFromDate,
  setCustomFromDate,
  customToDate,
  setCustomToDate,
  selectedMonth,
  setSelectedMonth,
  reportTypeTabs,
  years,
  properties,
  onReportGenerated,
  onGenerateLoanSummary,
}: GenerateReportsProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  // Income & Expenditure and Cost Base are the same report, just filtered to
  // a different category type — same Report Scope / Properties / Duration
  // controls, same builders, same output component.
  const handleGenerateReport = async () => {
    if (properties.length === 0) {
      alert("No properties available to generate a report.");
      return;
    }

    if (reportScope === "unit" && property === "all") {
      alert("Please select a specific property to generate a Unit Wise report.");
      return;
    }

    if (property !== "all" && reportScope === "unit") {
      const selectedProp = properties.find(p => p.id === property);
      if (selectedProp && getUnitLabelsForProperty(selectedProp).length === 0) {
        if (!confirm(`Property "${selectedProp.name}" doesn't have multiple units set up. Showing the Full Report instead. Continue?`)) {
          return;
        }
      }
    }

    if (duration === "custom") {
      if (!customFromDate || !customToDate) {
        alert("Please choose both a From Date and a To Date.");
        return;
      }
      if (customFromDate > customToDate) {
        alert("From Date must be before To Date.");
        return;
      }
    }

    if (duration === "month" && !selectedMonth) {
      alert("Please choose a month.");
      return;
    }

    // Financial Year compares the current + 2 prior years (multiple columns
    // for an Individual Property Report); Monthly and Custom Date are both
    // single periods, so they collapse to one column.
    const singlePeriod = duration === "custom" ? customDatePeriod(customFromDate, customToDate)
      : duration === "month" ? monthPeriod(selectedMonth)
      : financialYearPeriod(year);

    const isOwnershipWise = reportScope === "ownership";
    const reportKind: ReportKind = reportType === "cost" ? "cost-base" : "income-expenditure";

    setIsGenerating(true);
    onReportGenerated(null, isOwnershipWise);
    try {
      if (property === "all") {
        // All Properties / Ownership Wise (all): one column per property, all for the same period.
        const [transactions, schedulesByProperty] = await Promise.all([
          getTransactionsInRange(singlePeriod),
          fetchDepreciationSchedulesByProperty(properties.map(p => p.id)),
        ]);
        onReportGenerated(buildAllPropertiesReport(properties, transactions, singlePeriod, reportKind, schedulesByProperty), isOwnershipWise);
      } else {
        const selectedProp = properties.find(p => p.id === property);
        if (!selectedProp) {
          alert("Selected property not found.");
          return;
        }

        // "Depreciation (from Schedule)" is sourced straight from the
        // property's uploaded schedule, not from transactions — see reports.ts.
        const depreciationSchedules = await getDepreciationSchedules(property);

        // Unit Wise Report: one column per unit, always a single period —
        // same reasoning as Ownership Wise below. Falls back to the plain
        // Individual Property Report if the property has no units set up
        // (the confirm() above already warned the user about that).
        if (reportScope === "unit") {
          const unitLabels = getUnitLabelsForProperty(selectedProp);
          const transactions = await getTransactionsInRange({ propertyId: property, startDate: singlePeriod.startDate, endDate: singlePeriod.endDate });
          onReportGenerated(
            unitLabels.length > 0
              ? buildUnitWiseReport(selectedProp, unitLabels, transactions, singlePeriod, reportKind, depreciationSchedules)
              : buildIndividualPropertyReport(selectedProp, transactions, [singlePeriod], reportKind, depreciationSchedules),
            false
          );
          return;
        }

        // Individual Property Report: one column per period, for that property.
        // Ownership Wise and Cost Base always show a single period (one
        // column), even for Financial Year — the year-over-year comparison
        // is specific to the plain Income & Expenditure Full Report.
        const periods: ReportPeriod[] = (duration === "fy" && !isOwnershipWise && reportKind === "income-expenditure")
          ? getRecentFinancialYearLabels(3, year).map(financialYearPeriod)
          : [singlePeriod];
        const startDate = periods.reduce((min, p) => (p.startDate < min ? p.startDate : min), periods[0].startDate);
        const endDate = periods.reduce((max, p) => (p.endDate > max ? p.endDate : max), periods[0].endDate);
        const transactions = await getTransactionsInRange({ propertyId: property, startDate, endDate });
        onReportGenerated(buildIndividualPropertyReport(selectedProp, transactions, periods, reportKind, depreciationSchedules), isOwnershipWise);
      }
    } catch {
      alert("Failed to generate report. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const hasProperties = properties.length > 0;
  const isReportTable = reportType === "income" || reportType === "cost";

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-2 border-b">
        <h2 className="text-lg font-semibold text-gray-800">Generate & Download Reports</h2>
      </div>

      <div className="p-0">
        <div className="bg-white p-4 rounded-lg border border-gray-100">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Generate New Report</h3>

          {!hasProperties && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded mb-4 text-sm">
              No properties found. Please add a property first to generate reports.
            </div>
          )}

          {/* Report Type Tabs */}
          <div className="flex flex-wrap items-center gap-3 mb-8">
            {reportTypeTabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setReportType(t.id)}
                className={`px-4 py-2 rounded-full border text-sm w-full md:w-auto ${reportType === t.id
                  ? "bg-blue-50 border-blue-300 text-blue-700"
                  : "bg-white border-gray-200 text-gray-600"
                  }`}
                type="button"
                disabled={!hasProperties && t.id !== 'loan'} /* Maybe loan summary is general? unlikely */
              >
                {t.label}
              </button>
            ))}
          </div>

          {reportType === "loan" ? (
            <div className="mt-6 flex flex-wrap justify-center gap-4">
              <button
                className={`px-6 py-2 rounded-full bg-blue-600 text-white font-medium shadow ${!hasProperties ? 'opacity-50 cursor-not-allowed' : ''}`}
                type="button"
                onClick={() => {
                  if (hasProperties) onGenerateLoanSummary();
                }}
                disabled={!hasProperties}
              >
                Generate Report
              </button>
              <button
                className={`px-5 py-2 rounded-full bg-yellow-400 text-gray-900 font-medium ${!hasProperties ? 'opacity-50 cursor-not-allowed' : ''}`}
                type="button"
                onClick={() => {
                  if (hasProperties) console.log("Email Loan Summary Report");
                }}
                disabled={!hasProperties}
              >
                Email Report
              </button>
            </div>
          ) : isReportTable ? (
            <>
              <div className="mt-4 grid grid-cols-1 tablet:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-gray-600 mb-2">Report Scope</div>
                  <div className="flex flex-wrap items-center gap-4">
                    <label className={`inline-flex items-center gap-2 text-sm ${!hasProperties ? 'opacity-50' : ''}`}>
                      <input
                        type="radio"
                        name="scope"
                        value="full"
                        checked={reportScope === "full"}
                        onChange={() => setReportScope("full")}
                        disabled={!hasProperties}
                      />
                      <span>Full Report</span>
                    </label>

                    <label className={`inline-flex items-center gap-2 text-sm ${!hasProperties ? 'opacity-50' : ''}`}>
                      <input
                        type="radio"
                        name="scope"
                        value="ownership"
                        checked={reportScope === "ownership"}
                        onChange={() => setReportScope("ownership")}
                        disabled={!hasProperties}
                      />
                      <span>Ownership Wise Report</span>
                    </label>

                    <label className={`inline-flex items-center gap-2 text-sm ${!hasProperties ? 'opacity-50' : ''}`}>
                      <input
                        type="radio"
                        name="scope"
                        value="unit"
                        checked={reportScope === "unit"}
                        onChange={() => setReportScope("unit")}
                        disabled={!hasProperties}
                      />
                      <span>Unit Wise Report</span>
                    </label>
                  </div>
                </div>

                <div className="text-sm">
                  <label className="block text-gray-600 mb-2">Properties*</label>
                  <select
                    value={property}
                    onChange={(e) => setProperty(e.target.value)}
                    className="w-full border rounded px-3 py-2 text-sm disabled:bg-gray-100"
                    disabled={!hasProperties}
                  >
                    <option value="all">-- All Properties --</option>
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 tablet:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Choose Duration*</label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full border rounded px-3 py-2 text-sm disabled:bg-gray-100"
                    disabled={!hasProperties}
                  >
                    <option value="fy">Financial Year</option>
                    <option value="month">Monthly</option>
                    <option value="custom">Custom Date</option>
                  </select>
                </div>

                {duration === "custom" ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">From Date*</label>
                      <input
                        type="date"
                        value={customFromDate}
                        onChange={(e) => setCustomFromDate(e.target.value)}
                        max={customToDate || undefined}
                        className="w-full border rounded px-3 py-2 text-sm disabled:bg-gray-100"
                        disabled={!hasProperties}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">To Date*</label>
                      <input
                        type="date"
                        value={customToDate}
                        onChange={(e) => setCustomToDate(e.target.value)}
                        min={customFromDate || undefined}
                        className="w-full border rounded px-3 py-2 text-sm disabled:bg-gray-100"
                        disabled={!hasProperties}
                      />
                    </div>
                  </div>
                ) : duration === "month" ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">Select Month*</label>
                    <input
                      type="month"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      max={new Date().toISOString().slice(0, 7)}
                      className="w-full border rounded px-3 py-2 text-sm disabled:bg-gray-100"
                      disabled={!hasProperties}
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">Select Year*</label>
                    <select
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      className="w-full border rounded px-3 py-2 text-sm disabled:bg-gray-100"
                      disabled={!hasProperties}
                    >
                      {years.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="mt-6 flex flex-wrap justify-center gap-4">
                <button
                  className={`px-6 py-2 rounded-full bg-blue-600 text-white font-medium shadow ${(!hasProperties || isGenerating) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  type="button"
                  onClick={handleGenerateReport}
                  disabled={!hasProperties || isGenerating}
                >
                  {isGenerating ? 'Generating…' : 'Generate Report'}
                </button>
                <button
                  className={`px-5 py-2 rounded-full bg-yellow-400 text-gray-900 font-medium ${!hasProperties ? 'opacity-50 cursor-not-allowed' : ''}`}
                  type="button"
                  onClick={() => {
                    if (hasProperties) console.log("Email report");
                  }}
                  disabled={!hasProperties}
                >
                  Email Report
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
