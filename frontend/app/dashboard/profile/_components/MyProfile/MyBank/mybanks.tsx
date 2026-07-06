'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface BankAccount {
  id: number;
  bankName: string;
  accountNumber: string;
  accountType: string;
  balance: number;
}

export default function BankPage() {
  const [accounts] = useState<BankAccount[]>([
    // {
    //   id: 1,
    //   bankName: 'Chase Bank',
    //   accountNumber: '****1234',
    //   accountType: 'Checking',
    //   balance: 45000,
    // },
    // {
    //   id: 2,
    //   bankName: 'Bank of America',
    //   accountNumber: '****5678',
    //   accountType: 'Savings',
    //   balance: 125000,
    // },
    {
      id: 3,
      bankName: 'No Bank Account Connected',
      accountNumber: '',
      accountType: '',
      balance: 0,
    },
  ]);

  const [isAdding, setIsAdding] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Bank Accounts</h2>
          <p className="text-gray-500">Manage your connected bank accounts</p>
        </div>
        <Button onClick={() => setIsAdding(!isAdding)}>
          {isAdding ? 'Cancel' : 'Add Account'}
        </Button>
      </div>

      {isAdding && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Add New Bank Account</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="bankName">Bank Name</Label>
              <Input id="bankName" placeholder="Enter bank name" />
            </div>
            <div>
              <Label htmlFor="accountNumber">Account Number</Label>
              <Input id="accountNumber" placeholder="Enter account number" />
            </div>
            <div>
              <Label htmlFor="accountType">Account Type</Label>
              <Input id="accountType" placeholder="Checking, Savings, etc." />
            </div>
            <Button className="w-full">Connect Account</Button>
          </div>
        </Card>
      )}

      <div className="grid gap-4">
        {accounts.map((account) => (
          <Card key={account.id} className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">{account.bankName}</h3>
                <p className="text-sm text-gray-500">
                  {account.accountType} • {account.accountNumber}
                </p>
                <p className="text-2xl font-bold mt-2">
                  ${account.balance.toLocaleString()}
                </p>
              </div>
              <div className="space-x-2">
                <Button variant="outline" size="sm">
                  Sync
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
