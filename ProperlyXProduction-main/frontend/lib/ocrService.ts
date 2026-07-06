import Tesseract from 'tesseract.js';
import { extractData, type ExtractedData } from './ocrParser';
import { extractTextFromDocument } from './pdfService';

/**
 * OCR Service - Unified document processing
 * All extraction is now handled by the backend for consistency
 */

export interface OCRProcessingResult {
    success: boolean;
    rawText?: string;
    extractedData?: ExtractedData;
    confidence?: number;
    error?: string;
    pageCount?: number;
    isScanned?: boolean;
}

/**
 * Process any document (image or PDF)
 * Uses backend for text extraction, frontend for parsing
 */
export async function processDocument(
    file: File,
    onProgress?: (progress: number, status?: string) => void
): Promise<OCRProcessingResult> {
    try {
        const fileType = file.type;
        console.log('Processing document:', file.name, 'Type:', fileType);

        if (onProgress) onProgress(10, 'Sending to server...');

        // Use unified backend extraction for both PDFs and images
        const result = await extractTextFromDocument(file, (progress, status) => {
            if (onProgress) {
                onProgress(progress * 0.9, status);
            }
        });

        if (!result.success) {
            return {
                success: false,
                error: result.error || 'Document processing failed',
                isScanned: result.isScanned,
            };
        }

        const rawText = result.text || '';
        const pageCount = result.pageCount || 1;
        const isScanned = result.isScanned || false;
        const confidence = result.confidence || 90;

        if (onProgress) onProgress(95, 'Extracting transaction data...');

        // Use extractedData from backend if available (Gemini Vision provides this)
        // Otherwise, parse the raw text using the frontend parser
        let extractedData: ExtractedData;
        
        if (result.extractedData && result.extractedData.properties && result.extractedData.properties.length > 0) {
            // Backend already extracted structured data (e.g., from Gemini Vision)
            console.log('Using extractedData from backend:', result.transactionCount, 'transactions');
            extractedData = result.extractedData as ExtractedData;
        } else {
            // Extract structured data using our frontend parser
            extractedData = extractData(rawText);
        }

        if (onProgress) onProgress(100, 'Complete!');

        return {
            success: true,
            rawText,
            extractedData,
            confidence,
            pageCount,
            isScanned,
        };
    } catch (error) {
        console.error('Document processing error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Document processing failed',
        };
    }
}

/**
 * Process an image file with Tesseract OCR
 */
export async function processImageWithOCR(
    file: File,
    onProgress?: (progress: number) => void
): Promise<OCRProcessingResult> {
    try {
        console.log('Starting OCR processing for:', file.name);

        // Perform OCR with Tesseract
        const { data } = await Tesseract.recognize(file, 'eng', {
            logger: (m) => {
                if (m.status === 'recognizing text' && onProgress) {
                    onProgress(Math.round(m.progress * 100));
                }
                console.log('Tesseract:', m);
            },
        });

        const rawText = data.text;
        const confidence = data.confidence;

        console.log('OCR completed - Confidence:', confidence);
        console.log('Raw text length:', rawText.length);

        // Extract structured data using our parser
        const extractedData = extractData(rawText);

        return {
            success: true,
            rawText,
            extractedData,
            confidence,
        };
    } catch (error) {
        console.error('OCR processing error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'OCR processing failed',
        };
    }
}

/**
 * Extract line items from parsed data for transaction creation
 * Only includes items with sufficient confidence (>= 40%)
 * @param extractedData - The extracted OCR data
 * @param propertyId - The property ID to assign to transactions
 * @param minConfidence - Minimum confidence threshold (default 40)
 * @param filterByPropertyName - Optional property name to filter line items (matches against propertySection.propertyName)
 */
export function extractLineItemsForTransactions(
    extractedData: ExtractedData,
    propertyId: string,
    minConfidence: number = 40, // Minimum confidence threshold (lowered for PDF support)
    filterByPropertyName?: string // Filter by property name from invoice
) {
    const transactions: Array<{
        propertyId: string;
        description: string;
        amount: number;
        type: 'income' | 'expense';
        category: string;
        confidence: number;
        metadata: Record<string, unknown>;
    }> = [];

    // Process each property section
    for (const propertySection of extractedData.properties) {
        // Filter by property name if specified (case-insensitive partial match)
        if (filterByPropertyName) {
            // Normalize both names for better matching
            const normalizeName = (name: string) => name.toLowerCase().trim().replace(/\s+/g, ' ').replace(/,\s*/g, ', ');
            const sectionNameNormalized = normalizeName(propertySection.propertyName);
            const filterNameNormalized = normalizeName(filterByPropertyName);

            console.log('Property matching debug:');
            console.log('  Section name (from invoice):', sectionNameNormalized);
            console.log('  Filter name (user property):', filterNameNormalized);

            const extractKeyComponents = (name: string) => {
                const normalized = name.toLowerCase().trim();
                const components = {
                    number: '',
                    street: '',
                };

                // Extract unit/street number pattern (e.g., "2a/35" or "35" or "2/3")
                // We look for the first word that starts with a number
                const words = normalized.split(/[\s,]+/);
                const numberMatch = words[0]?.match(/(\d+[a-z]?\/?\d*[a-z]?)/);
                if (numberMatch) {
                    components.number = numberMatch[1];
                }

                // Extract street name
                // Look for common street types and take the word before it
                // Added 'pi' for Place abbreviation
                const streetTypeIndex = words.findIndex(w => /^(st|street|rd|road|ave|avenue|dr|drive|ct|court|pl|place|pi|way|ln|lane|blvd|boulevard|cres|crescent|pde|parade|tce|terrace|hwy|highway)$/i.test(w));
                if (streetTypeIndex > 0) {
                    components.street = words[streetTypeIndex - 1];
                } else if (words.length > 1) {
                    // Fallback: if no street type found, use the word after number or first word
                    components.street = components.number ? words[1] : words[0];
                }

                return components;
            };

            const sectionComponents = extractKeyComponents(sectionNameNormalized);
            const filterComponents = extractKeyComponents(filterNameNormalized);

            console.log('  Section components:', sectionComponents);
            console.log('  Filter components:', filterComponents);

            // 1. Exact normalized match
            const exactMatch = sectionNameNormalized === filterNameNormalized;

            // 2. Partial match (one contains the other)
            const partialMatch = sectionNameNormalized.includes(filterNameNormalized) ||
                filterNameNormalized.includes(sectionNameNormalized);

            // 3. Component-based match with strictness
            // If both have numbers, they MUST match
            let componentsMatch = false;
            if (sectionComponents.street && filterComponents.street &&
                (sectionComponents.street.includes(filterComponents.street) || filterComponents.street.includes(sectionComponents.street))) {

                // Street matches, now check numbers
                if (sectionComponents.number && filterComponents.number) {
                    // Both have numbers - they must match exactly or one must be a substring of the other (e.g. "35" in "1/35")
                    componentsMatch = sectionComponents.number === filterComponents.number ||
                        sectionComponents.number.includes(filterComponents.number) ||
                        filterComponents.number.includes(sectionComponents.number);
                } else {
                    // At least one is missing a number - allow matches based on street name alone
                    // (This handles cases where the OCR might have missed the number but got the street)
                    componentsMatch = true;
                }
            }

            // 4. NEW: Loose street name match (just check if street names overlap)
            const looseStreetMatch = sectionComponents.street && filterComponents.street &&
                sectionComponents.street === filterComponents.street;

            console.log('  Match results:', { exactMatch, partialMatch, componentsMatch, looseStreetMatch });

            if (!exactMatch && !partialMatch && !componentsMatch && !looseStreetMatch) {
                // Skip this property section if it doesn't match
                console.log('  -> No match, skipping this property section');
                continue;
            }
            console.log('  -> Match found! Including transactions from this property section');
        }

        for (const lineItem of propertySection.lineItems) {
            const amount = parseFloat(lineItem.moneyIn || lineItem.moneyOut || '0');
            const confidence = (lineItem as { confidence?: number }).confidence || 50;

            // Skip low confidence items
            if (confidence < minConfidence) {
                console.log(`Skipping low-confidence item (${confidence}%): ${lineItem.description}`);
                continue;
            }

            // Skip invalid amounts
            if (amount <= 0 || amount > 999999) {
                console.log(`Skipping invalid amount ($${amount}): ${lineItem.description}`);
                continue;
            }

            const isIncome = lineItem.moneyIn !== null;

            // Map description to category
            const category = mapDescriptionToCategory(lineItem.description, isIncome);

            transactions.push({
                propertyId,
                description: lineItem.description,
                amount,
                type: isIncome ? 'income' : 'expense',
                category,
                confidence,
                metadata: {
                    propertyName: propertySection.propertyName,
                    includedTax: lineItem.includedTax,
                    extractedFrom: 'OCR',
                    agencyName: extractedData.agencyName,
                    folioNumber: extractedData.folioNumber,
                    confidence,
                },
            });
        }
    }

    console.log(`Extracted ${transactions.length} valid transactions for auto-save`);
    return transactions;
}

/**
 * Map OCR description to transaction category
 * Returns 'sundry-rental-expenses' if no specific category matches
 */
function mapDescriptionToCategory(description: string, isIncome: boolean): string {
    const lowerDesc = description.toLowerCase();

    if (isIncome) {
        if (lowerDesc.includes('rent')) return 'rental-income';
        if (lowerDesc.includes('outgoings received')) return 'variable-outgoings-received';
        return 'other-rental-income';
    } else {
        // Water categories MUST be checked BEFORE council-rates to prevent misclassification
        if (lowerDesc.includes('water rate') || lowerDesc.includes('water rates') || lowerDesc.includes('water charges') || lowerDesc.includes('water levy')) return 'water-rates';
        if (lowerDesc.includes('water usage') || lowerDesc.includes('water consumption')) return 'water-usage';
        if (lowerDesc.includes('council rates') || lowerDesc.includes('council rate') || lowerDesc.includes('council levy') || lowerDesc.includes('rates notice')) return 'council-rates';
        if (lowerDesc.includes('garden') || lowerDesc.includes('lawn') || lowerDesc.includes('mowing') || lowerDesc.includes('landscap')) return 'gardening';
        if (lowerDesc.includes('accounting') || lowerDesc.includes('legal') || lowerDesc.includes('solicitor') || lowerDesc.includes('lawyer')) return 'accounting-legal';
        if (lowerDesc.includes('pest') || lowerDesc.includes('termite')) return 'pest-control';
        if (lowerDesc.includes('management') || lowerDesc.includes('agency fee') || lowerDesc.includes('commission') || lowerDesc.includes('letting fee')) return 'management-fees';
        if (lowerDesc.includes('property agent') || lowerDesc.includes('agent fee') || lowerDesc.includes('agent charge')) return 'property-agent-fees';
        if (lowerDesc.includes('adjustment at purchase') || lowerDesc.includes('purchase adjustment')) return 'adjustment-at-purchase';
        if (lowerDesc.includes('gas') || lowerDesc.includes('electricity') || lowerDesc.includes('energy') || lowerDesc.includes('power bill')) return 'gas-electricity';
        if (lowerDesc.includes('repair') || lowerDesc.includes('maintenance') || lowerDesc.includes('plumbing') || lowerDesc.includes('electrical') || lowerDesc.includes('fix')) return 'repairs-maintenance';
        if (lowerDesc.includes('land tax')) return 'land-tax';
        if (lowerDesc.includes('depreciation') || lowerDesc.includes('deprec')) return 'depreciation';
        if (lowerDesc.includes('interest') || lowerDesc.includes('loan interest') || lowerDesc.includes('mortgage interest')) return 'interest-on-loans';
        if (lowerDesc.includes('loan setup') || lowerDesc.includes('loan establishment') || lowerDesc.includes('loan application')) return 'loan-setup-cost';
        if (lowerDesc.includes('lmi') || lowerDesc.includes('lender mortgage insurance') || lowerDesc.includes('mortgage insurance')) return 'lmi';
        if (lowerDesc.includes('bank fee') || lowerDesc.includes('bank charge') || lowerDesc.includes('account fee')) return 'bank-fees';
        if (lowerDesc.includes('insurance') || lowerDesc.includes('premium') || lowerDesc.includes('landlord insurance')) return 'insurance';
        if (lowerDesc.includes('compliance') || lowerDesc.includes('testing') || lowerDesc.includes('smoke alarm') || lowerDesc.includes('safety check') || lowerDesc.includes('inspection')) return 'compliance-testing';
        if (lowerDesc.includes('advertis') || lowerDesc.includes('marketing') || lowerDesc.includes('tenant search')) return 'advertising';
        if (lowerDesc.includes('body corporate') || lowerDesc.includes('strata') || lowerDesc.includes('levy') || lowerDesc.includes('owners corporation')) return 'body-corporate';
        if (lowerDesc.includes('borrowing expense') || lowerDesc.includes('borrowing cost') || lowerDesc.includes('loan cost')) return 'borrowing-expenses';
        if (lowerDesc.includes('clean')) return 'cleaning';
        if (lowerDesc.includes('outgoings paid')) return 'variable-outgoings-paid';
        if (lowerDesc.includes('utility levy') || lowerDesc.includes('utility charge')) return 'utility-levy';
        if (lowerDesc.includes('internet') || lowerDesc.includes('broadband') || lowerDesc.includes('nbn')) return 'internet';
        if (lowerDesc.includes('water')) return 'water-rates'; // Broad fallback for anything water related not caught above

        // Cost categories (treated as expenses for now)
        if (lowerDesc.includes('stamp duty') || lowerDesc.includes('transfer duty')) return 'stamp-duty';
        if (lowerDesc.includes('conveyancer') || lowerDesc.includes('conveyancing fee') || lowerDesc.includes('settlement fee')) return 'conveyancer-fees';
        if (lowerDesc.includes('purchase cost') || lowerDesc.includes('purchase price') || lowerDesc.includes('acquisition')) return 'purchase-cost';

        // Default to sundry rental expenses if no category matches
        return 'sundry-rental-expenses';
    }
}

