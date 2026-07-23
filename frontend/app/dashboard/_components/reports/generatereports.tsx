"use client";

import React, { useState } from "react";

import { Property } from "@/lib/property";
import { getTransactionsInRange } from "@/lib/transaction";
import {
  buildAllPropertiesReport,
  buildIndividualPropertyReport,
  buildCostBaseReport,
  getFinancialYearRange,
  getRecentFinancialYearLabels,
  type ReportData,
  type CostBaseReport,
} from "@/lib/reports";

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
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  reportTypeTabs: { id: string; label: string }[];
  years: string[];
  properties: Property[];
  onReportGenerated: (report: ReportData | null) => void;
  onGenerateLoanSummary: () => void;
  onCostBaseGenerated: (report: CostBaseReport | null) => void;
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
  selectedDate,
  setSelectedDate,
  reportTypeTabs,
  years,
  properties,
  onReportGenerated,
  onGenerateLoanSummary,
  onCostBaseGenerated,
}: GenerateReportsProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  // Validation function
  const handleGenerateReport = async () => {
    if (properties.length === 0) {
      alert("No properties available to generate a report.");
      return;
    }

    if (property !== "all") {
      const selectedProp = properties.find(p => p.id === property);
      if (selectedProp) {
        if (reportScope === "unit" && (!selectedProp.units || selectedProp.units <= 1)) {
          if (!confirm(`Property "${selectedProp.name}" has only ${selectedProp.units || 1} unit. The Unit Wise report might not be useful. Continue?`)) {
            return;
          }
        }
      }
    }

    if (reportScope !== "full") {
      alert(`${reportScope === "ownership" ? "Ownership Wise" : "Unit Wise"} reports aren't available yet — showing the Full Report instead.`);
    }

    if (duration !== "fy") {
      alert("Monthly reports aren't available yet — showing the current Financial Year instead.");
    }

    setIsGenerating(true);
    onReportGenerated(null);
    try {
      if (property === "all") {
        // All Properties Report: one column per property, all for the selected year.
        const { startDate, endDate } = getFinancialYearRange(year);
        const transactions = await getTransactionsInRange({ startDate, endDate });
        onReportGenerated(buildAllPropertiesReport(properties, transactions, year));
      } else {
        // Individual Property Report: one column per year (current + 2 prior), for that property.
        const selectedProp = properties.find(p => p.id === property);
        if (!selectedProp) {
          alert("Selected property not found.");
          return;
        }
        const yearLabels = getRecentFinancialYearLabels(3, year);
        const ranges = yearLabels.map(getFinancialYearRange);
        const startDate = ranges.reduce((min, r) => (r.startDate < min ? r.startDate : min), ranges[0].startDate);
        const endDate = ranges.reduce((max, r) => (r.endDate > max ? r.endDate : max), ranges[0].endDate);
        const transactions = await getTransactionsInRange({ propertyId: property, startDate, endDate });
        onReportGenerated(buildIndividualPropertyReport(selectedProp, transactions, yearLabels));
      }
    } catch {
      alert("Failed to generate report. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateCostBaseReport = async () => {
    if (properties.length === 0) {
      alert("No properties available.");
      return;
    }
    if (!selectedDate) {
      alert("Please choose a date.");
      return;
    }

    const selectedProperties = property === "all" ? properties : properties.filter(p => p.id === property);

    setIsGenerating(true);
    onCostBaseGenerated(null);
    try {
      const transactions = await getTransactionsInRange({ endDate: selectedDate });
      const report = buildCostBaseReport(selectedProperties, transactions, selectedDate);
      onCostBaseGenerated(report);
    } catch {
      alert("Failed to generate report. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const hasProperties = properties.length > 0;

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
          ) : reportType === "cost" ? (
            <>
              <div className="mt-4 grid grid-cols-1 tablet:grid-cols-2 gap-4">
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
                <div className="text-sm">
                  <label className="block text-gray-600 mb-2">Date*</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full border rounded px-3 py-2 text-sm disabled:bg-gray-100"
                    disabled={!hasProperties}
                  />
                </div>
              </div>
              <div className="mt-6 flex flex-wrap justify-center gap-4">
                <button
                  className={`px-6 py-2 rounded-full bg-blue-600 text-white font-medium shadow ${(!hasProperties || isGenerating) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  type="button"
                  onClick={handleGenerateCostBaseReport}
                  disabled={!hasProperties || isGenerating}
                >
                  {isGenerating ? 'Generating…' : 'Generate Report'}
                </button>
                <button
                  className={`px-5 py-2 rounded-full bg-yellow-400 text-gray-900 font-medium ${!hasProperties ? 'opacity-50 cursor-not-allowed' : ''}`}
                  type="button"
                  onClick={() => {
                    if (hasProperties) console.log("Email Cost Base Report");
                  }}
                  disabled={!hasProperties}
                >
                  Email Report
                </button>
              </div>
            </>
          ) : (
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
                      <span>Ownership Wise</span>
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
                      <span>Unit Wise</span>
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
                  </select>
                </div>

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
          )}
        </div>
      </div>
    </div>
  );
}