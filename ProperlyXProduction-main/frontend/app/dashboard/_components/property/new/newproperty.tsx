'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function NewPropertyPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [units, setUnits] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      router.push('/properties');
    }, 1000);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Add New Property</h1>
        <p className="text-gray-500">Add a new property to your portfolio</p>
      </div>

      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <form onSubmit={onSubmit} className="space-y-6">
            <div>
              <Label htmlFor="name">Property Name</Label>
              <div className="mt-1">
                <Input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="address">Address</Label>
              <div className="mt-1">
                <Input
                  id="address"
                  name="address"
                  type="text"
                  required
                  value={address}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddress(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="units">Number of Units</Label>
              <div className="mt-1">
                <Input
                  id="units"
                  name="units"
                  type="number"
                  required
                  value={units}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUnits(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? 'Saving...' : 'Save Property'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}