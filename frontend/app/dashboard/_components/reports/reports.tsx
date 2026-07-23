"use client";

import React, { useState, useEffect } from "react";
import GenerateReports from "./generatereports";
import TaxSupporting from "./taxsupporting";
import DownloadDocuments from "./downloaddocuments";
import ReportOutput from "./ReportOutput";
import LoanSummaryOutput from "./LoanSummaryOutput";
import CostBaseOutput from "./CostBaseOutput";
import { getProperties, type Property } from "@/lib/property";
import type { ReportData, CostBaseReport } from "@/lib/reports";


export default function ReportsContent() {
  const [reportType, setReportType] = useState<string>("income");
  const [reportScope, setReportScope] = useState<string>("full");
  const [property, setProperty] = useState<string>("all");
  const [duration, setDuration] = useState<string>("fy");
  const [year, setYear] = useState<string>("FY 24-25");
  // ISO format (YYYY-MM-DD) — required by the native <input type="date"> below.
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [customFromDate, setCustomFromDate] = useState<string>("");
  const [customToDate, setCustomToDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [properties, setProperties] = useState<Property[]>([]);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [showLoanSummary, setShowLoanSummary] = useState(false);
  const [costBaseReport, setCostBaseReport] = useState<CostBaseReport | null>(null);

  // Fetch properties on mount
  useEffect(() => {
    async function loadProperties() {
      const data = await getProperties();
      setProperties(data);
    }
    loadProperties();
  }, []);

  const reportTypeTabs = [
    { id: "income", label: "Income & Expenditure" },
    { id: "cost", label: "Cost Base" },
    { id: "loan", label: "Loan Summary" },
  ];

  const years = ["FY 25-26", "FY 24-25", "FY 23-24", "FY 22-23"];

  return (
    <main className="flex-1 overflow-auto p-4 sm:p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto grid grid-cols-1 tablet:grid-cols-12 lg:grid-cols-12 gap-6">
        {/* Left column: form */}
        <div className="col-span-1 tablet:col-span-8 lg:col-span-8">
          <GenerateReports
            reportType={reportType}
            setReportType={setReportType}
            reportScope={reportScope}
            setReportScope={setReportScope}
            property={property}
            setProperty={setProperty}
            duration={duration}
            setDuration={setDuration}
            year={year}
            setYear={setYear}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            customFromDate={customFromDate}
            setCustomFromDate={setCustomFromDate}
            customToDate={customToDate}
            setCustomToDate={setCustomToDate}
            reportTypeTabs={reportTypeTabs}
            years={years}
            properties={properties}
            onReportGenerated={setReportData}
            onGenerateLoanSummary={() => setShowLoanSummary(true)}
            onCostBaseGenerated={setCostBaseReport}
          />

          {reportData && (
            <ReportOutput report={reportData} onClose={() => setReportData(null)} />
          )}
          {showLoanSummary && (
            <LoanSummaryOutput properties={properties} onClose={() => setShowLoanSummary(false)} />
          )}
          {costBaseReport && (
            <CostBaseOutput report={costBaseReport} onClose={() => setCostBaseReport(null)} />
          )}
        </div>

        {/* Right column: download cards */}
        <div className="col-span-1 tablet:col-span-4 lg:col-span-4">
          <div className="grid grid-cols-1 tablet:grid-cols-1 lg:grid-cols-1 gap-4">
            <DownloadDocuments />

            <TaxSupporting years={years} />


          </div>
        </div>
      </div>
    </main>
  );
}
