'use client';

import { useRouter } from 'next/navigation';
import OCRPage from './OCR';

export default function ClientOCRWrapper() {
  const router = useRouter();

  const handleBackClick = () => {
    router.back();
  };

  return <OCRPage onBackClick={handleBackClick} />;
}