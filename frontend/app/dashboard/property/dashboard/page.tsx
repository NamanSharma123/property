'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function PropertyDashboardRoute() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const propertyId = searchParams.get('id');

    useEffect(() => {
        if (propertyId) {
            // Redirect to proper route with property ID
            router.replace(`/dashboard/property/${propertyId}`);
        } else {
            // No property ID, go back to property list
            router.replace('/dashboard/property');
        }
    }, [propertyId, router]);

    return (
        <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
    );
}
