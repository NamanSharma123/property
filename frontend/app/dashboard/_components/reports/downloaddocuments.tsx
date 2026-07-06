"use client";

import React from "react";

export default function DownloadDocuments() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h4 className="text-sm font-medium text-gray-700 mb-3">Download Documents</h4>
      <ul className="space-y-2">
        <li className="flex items-center justify-between p-3 rounded-md bg-gray-50">
          <span className="text-sm">Bank Statement</span>
          <span>→</span>
        </li>
        <li className="flex items-center justify-between p-3 rounded-md bg-gray-50">
          <span className="text-sm">Documents</span>
          <span>→</span>
        </li>
        <li className="flex items-center justify-between p-3 rounded-md bg-gray-50">
          <span className="text-sm">ATO Audit Supporting</span>
          <span>→</span>
        </li>
      </ul>
    </div>
  );
}