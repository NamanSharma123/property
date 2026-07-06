'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface TaxAccountant {
  id: number;
  name: string;
  firm: string;
  email: string;
  phone: string;
  specialty: string;
  yearsExperience: number;
}

export default function TaxAccountantPage() {
  const [accountants] = useState<TaxAccountant[]>([
    {
      id: 1,
      name: 'Sarah Johnson, CPA',
      firm: 'Johnson & Associates Tax Advisors',
      email: 'sarah.johnson@jtaxadvisors.com',
      phone: '(555) 987-6543',
      specialty: 'Real Estate Tax Planning',
      yearsExperience: 12,
    },
  ]);

  const [isAdding, setIsAdding] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Tax Accountants</h2>
          <p className="text-gray-500">Manage your tax professional contacts</p>
        </div>
        <Button onClick={() => setIsAdding(!isAdding)}>
          {isAdding ? 'Cancel' : 'Add Accountant'}
        </Button>
      </div>

      {isAdding && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Add New Tax Accountant</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" placeholder="Enter accountant name" />
            </div>
            <div>
              <Label htmlFor="firm">Firm/Company</Label>
              <Input id="firm" placeholder="Enter firm name" />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="Enter email" />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" placeholder="Enter phone number" />
            </div>
            <div>
              <Label htmlFor="specialty">Specialty</Label>
              <Input id="specialty" placeholder="Enter specialty" />
            </div>
            <div>
              <Label htmlFor="experience">Years of Experience</Label>
              <Input id="experience" type="number" placeholder="Enter years" />
            </div>
            <Button className="w-full">Save Accountant</Button>
          </div>
        </Card>
      )}

      <div className="grid gap-4">
        {accountants.map((accountant) => (
          <Card key={accountant.id} className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold">{accountant.name}</h3>
                <p className="text-sm text-gray-500">{accountant.firm}</p>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Email</p>
                    <p className="text-sm text-gray-900">{accountant.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Phone</p>
                    <p className="text-sm text-gray-900">{accountant.phone}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Specialty</p>
                    <p className="text-sm text-blue-600 font-medium">{accountant.specialty}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Experience</p>
                    <p className="text-sm text-gray-900">{accountant.yearsExperience} years</p>
                  </div>
                </div>
              </div>
              <div className="ml-4 space-x-2">
                <Button variant="outline" size="sm">
                  Edit
                </Button>
                <Button variant="outline" size="sm">
                  Remove
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-6 bg-blue-50 border-blue-200">
        <div className="flex items-start">
          <svg className="h-6 w-6 text-blue-600 mr-3 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="text-sm font-medium text-blue-900">Tax Season Reminder</h3>
            <p className="text-sm text-blue-700 mt-1">
              Don&apos;t forget to schedule your tax consultation ahead of the filing deadline.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
