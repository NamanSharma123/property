'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface AuditCheck {
  id: number;
  category: string;
  description: string;
  status: 'passed' | 'failed' | 'warning';
  lastChecked: string;
}

export default function AuditChecksPage() {
  const [auditChecks] = useState<AuditCheck[]>([]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed':
        return 'text-green-700 bg-green-100';
      case 'failed':
        return 'text-red-700 bg-red-100';
      case 'warning':
        return 'text-yellow-700 bg-yellow-100';
      default:
        return 'text-gray-700 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return (
          <svg className="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'failed':
        return (
          <svg className="h-5 w-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="h-5 w-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Audit Checks</h1>
          <p className="text-gray-500">Review compliance and audit status</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          Run All Checks
        </Button>
      </div>

      {auditChecks.length === 0 ? (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <svg
              className="h-12 w-12 text-gray-400 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No audit checks yet</h3>
            <p className="text-sm text-gray-500">
              Click &quot;Run All Checks&quot; to start reviewing compliance for your properties
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4">
          {auditChecks.map((check) => (
            <Card key={check.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="mt-1">{getStatusIcon(check.status)}</div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {check.category}
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">{check.description}</p>
                    <p className="mt-2 text-xs text-gray-500">
                      Last checked: {new Date(check.lastChecked).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(
                      check.status
                    )}`}
                  >
                    {check.status.charAt(0).toUpperCase() + check.status.slice(1)}
                  </span>
                  <Button variant="outline" size="sm">
                    Details
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card className="p-6 bg-blue-50 border-blue-200">
        <div className="flex items-center">
          <svg className="h-6 w-6 text-blue-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="text-sm font-medium text-blue-900">Audit Schedule</h3>
            <p className="text-sm text-blue-700">
              No comprehensive audit scheduled yet.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
