/**
 * Document Processing Service
 * Sends documents to the backend for text extraction
 * 
 * - PDFs: Backend uses pdf-parse (fast text extraction)
 * - Images: Backend uses Tesseract.js (OCR)
 */

import { getAccessToken } from './api';

export interface ProcessingResult {
    success: boolean;
    text?: string;
    pageCount?: number;
    isScanned?: boolean;
    confidence?: number;
    error?: string;
    method?: string;
    extractedData?: {
        agencyName: string | null;
        folioNumber: string | null;
        statementPeriod: { from: string | null; to: string | null };
        properties: Array<{
            propertyName: string;
            lineItems: Array<{
                description: string;
                includedTax: string | null;
                moneyIn: string | null;
                moneyOut: string | null;
                category?: string;
                confidence?: number;
            }>;
            subtotalMoneyIn: string | null;
            subtotalMoneyOut: string | null;
        }>;
        totalMoneyIn: string | null;
        totalMoneyOut: string | null;
    };
    transactionCount?: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

/**
 * Extract text from any document (PDF or image) using backend API
 */
export async function extractTextFromDocument(
    file: File,
    onProgress?: (progress: number, status: string) => void
): Promise<ProcessingResult> {
    try {
        console.log('Sending document to backend:', file.name, file.type);

        if (onProgress) onProgress(10, 'Uploading file...');

        // Get auth token
        const token = getAccessToken();
        if (!token) {
            return {
                success: false,
                error: 'Authentication required. Please login again.',
            };
        }

        // Create form data with the file
        const formData = new FormData();
        formData.append('file', file);

        if (onProgress) onProgress(30, 'Processing document...');

        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

        // Send to unified backend API
        try {
            const response = await fetch(`${API_BASE_URL}/api/ocr/extract`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (onProgress) onProgress(80, 'Extracting text...');

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    error: data.error || `Server error: ${response.status}`,
                };
            }

            if (onProgress) onProgress(100, 'Complete!');

            // Check if we have extractedData from Gemini Vision (handles images directly)
            if (data.extractedData && data.extractedData.properties && data.extractedData.properties.length > 0) {
                console.log('Document processed with extractedData:', {
                    method: data.method,
                    transactionCount: data.transactionCount,
                    pageCount: data.pageCount,
                });

                // Return success with extractedData from backend
                return {
                    success: true,
                    text: data.text || '',
                    pageCount: data.pageCount || 1,
                    isScanned: false,
                    method: data.method,
                    extractedData: data.extractedData, // Pass through the extracted data
                    transactionCount: data.transactionCount,
                    confidence: data.confidence,
                };
            }

            // Check if document is scanned (no text extracted and no extractedData)
            if (data.isScanned || !data.text || data.text.length < 20) {
                return {
                    success: false,
                    isScanned: true,
                    pageCount: data.pageCount || 0,
                    error: data.message || 'Could not extract text from this document.',
                };
            }

            console.log('Document processed:', {
                method: data.method,
                textLength: data.text?.length,
                pageCount: data.pageCount,
            });

            return {
                success: true,
                text: data.text,
                pageCount: data.pageCount || 1,
                isScanned: false,
                method: data.method,
            };

        } catch (error: unknown) {
            clearTimeout(timeoutId);
            throw error;
        }

    } catch (error: unknown) {
        console.error('Document processing error:', error);

        if (error instanceof Error) {
            if (error.name === 'AbortError') {
                return {
                    success: false,
                    error: 'Request timed out. Please check your connection or try a smaller file.',
                };
            }
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                return {
                    success: false,
                    error: 'Cannot connect to server. Please check your connection.',
                };
            }
            return {
                success: false,
                error: error.message,
            };
        }

        return {
            success: false,
            error: 'Failed to process document.',
        };
    }
}

// Backward compatibility - redirect to unified function
export async function extractTextFromPDF(
    file: File,
    onProgress?: (progress: number, currentPage: number, totalPages: number) => void
): Promise<ProcessingResult> {
    return extractTextFromDocument(file, (progress) => {
        if (onProgress) {
            onProgress(progress, 1, 1);
        }
    });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function isPDFScanned(_file: File): Promise<boolean> {
    return true;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getPDFPageCount(_file: File): Promise<number> {
    return 0;
}

