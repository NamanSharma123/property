'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import OCRPage from '@/app/dashboard/_components/OCR/OCR';

export default function OCRRoute() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const propertyId = searchParams.get('propertyId') || undefined;

    const handleBackClick = () => {
        router.push(propertyId ? `/dashboard/property/${propertyId}` : '/dashboard/transactions');
    };

    return <OCRPage onBackClick={handleBackClick} initialPropertyId={propertyId} />;
}
