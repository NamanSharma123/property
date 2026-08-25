"use client";

import OcrReviewPanel from '@/app/admin/_components/Ocr/OcrReviewPanel';
import { useIsFullAdmin } from '@/app/admin/_components/AdminSessionContext';

export default function AdminOcrReviewPage() {
  const isFullAdmin = useIsFullAdmin();
  return <OcrReviewPanel isFullAdmin={isFullAdmin} />;
}
