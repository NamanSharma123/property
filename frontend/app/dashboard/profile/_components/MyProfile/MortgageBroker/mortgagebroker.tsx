'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface MortgageBroker {
  id: number;
  name: string;
  company: string;
  email: string;
  phone: string;
  specialty: string;
}

export default function MortgageBrokerPage() {
  const [brokers] = useState<MortgageBroker[]>([
    {
      id: 1,
      name: 'John Smith',
      company: 'Premier Mortgage Solutions',
      email: 'john.smith@premiermortgage.com',
      phone: '(555) 123-4567',
      specialty: 'Commercial Properties',
    },
  ]);

  const [isAdding, setIsAdding] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Mortgage Brokers</h2>
          <p className="text-gray-500">Manage your mortgage broker contacts</p>
        </div>
        <Button onClick={() => setIsAdding(!isAdding)}>
          {isAdding ? 'Cancel' : 'Add Broker'}
        </Button>
      </div>

      {isAdding && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Add New Mortgage Broker</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" placeholder="Enter broker name" />
            </div>
            <div>
              <Label htmlFor="company">Company</Label>
              <Input id="company" placeholder="Enter company name" />
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
            <Button className="w-full">Save Broker</Button>
          </div>
        </Card>
      )}

      <div className="grid gap-4">
        {brokers.map((broker) => (
          <Card key={broker.id} className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">{broker.name}</h3>
                <p className="text-sm text-gray-500">{broker.company}</p>
                <div className="mt-3 space-y-1">
                  <p className="text-sm text-gray-600 flex items-center">
                    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {broker.email}
                  </p>
                  <p className="text-sm text-gray-600 flex items-center">
                    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    {broker.phone}
                  </p>
                  <p className="text-sm text-blue-600 font-medium">
                    {broker.specialty}
                  </p>
                </div>
              </div>
              <div className="space-x-2">
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
    </div>
  );
}
