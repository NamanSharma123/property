'use client';

import { useRouter } from 'next/navigation';
import OCRPage from '@/app/dashboard/_components/OCR/OCR';

export default function OCRRoute() {
    const router = useRouter();

    const handleBackClick = () => {
        router.push('/dashboard/transactions');
    };

    return <OCRPage onBackClick={handleBackClick} />;
}


