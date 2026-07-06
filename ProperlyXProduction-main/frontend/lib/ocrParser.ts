/**
 * OCR Parser for Property Management Documents
 * VERSION 5.0 - Accurate transaction extraction with strict validation
 * 
 * Based on OCR-model-test reference implementation
 * Key improvements:
 * - Strict amount pattern (requires $ or .XX format)
 * - Context-aware income/expense detection
 * - Skip summary/total lines
 * - Minimal false positives
 */

export interface LineItem {
    description: string;
    includedTax: string | null;
    moneyOut: string | null;
    moneyIn: string | null;
    confidence: number;
    category: string;
}

export interface PropertySection {
    propertyName: string;
    lineItems: LineItem[];
    subtotalMoneyOut: string | null;
    subtotalMoneyIn: string | null;
}

export interface ExtractedData {
    agencyName: string | null;
    folioNumber: string | null;
    statementPeriod: {
        from: string | null;
        to: string | null;
    };
    statementDate: string | null; // Added explicitly
    properties: PropertySection[];
    totalMoneyIn: string | null;
    totalMoneyOut: string | null;
    rawText: string;
}

// ============ CATEGORY MAPPING ============
const CATEGORY_MAP: Record<string, string[]> = {
    // Income
    'rental-income': ['rent', 'rental income', 'rental'],
    'other-rental-income': ['other income', 'other rental'],
    'variable-outgoings-received': ['outgoings received', 'variable outgoings rec'],

    // Expenses - Water categories MUST be checked before council-rates
    // to prevent "Water Rates" from matching patterns in council-rates
    'water-rates': ['water rates', 'water rate', 'water charges', 'water levy'],
    'water-usage': ['water usage', 'water consumption'],
    'council-rates': ['council rates', 'council rate', 'council levy', 'rates notice'],
    'gardening': ['garden', 'lawn', 'mowing', 'landscap'],
    'accounting-legal': ['accounting', 'legal', 'solicitor', 'conveyancing', 'lawyer'],
    'pest-control': ['pest', 'termite'],
    'management-fees': ['management fee', 'management commission', 'agency fee', 'letting fee', 'agent fee'],
    'property-agent-fees': ['property agent', 'agent other fee', 'agent charges'],
    'adjustment-at-purchase': ['adjustment at purchase', 'purchase adjustment'],
    'gas-electricity': ['gas', 'electricity', 'energy', 'power bill'],
    'repairs-maintenance': ['repair', 'maintenance', 'plumbing', 'electrical', 'fix'],
    'land-tax': ['land tax'],
    'sundry-rental-expenses': ['sundry', 'miscellaneous', 'other expense'],
    'depreciation': ['depreciation', 'deprec'],
    'interest-on-loans': ['interest', 'loan interest', 'mortgage interest'],
    'loan-setup-cost': ['loan setup', 'loan establishment', 'loan application'],
    'lmi': ['lmi', 'lender mortgage insurance', 'mortgage insurance'],
    'bank-fees': ['bank fee', 'bank charge', 'account fee'],
    'insurance': ['insurance', 'premium', 'landlord insurance', 'building insurance'],
    'compliance-testing': ['compliance', 'testing', 'smoke alarm', 'safety check', 'inspection'],
    'advertising': ['advertis', 'marketing', 'tenant search', 'letting campaign'],
    'body-corporate': ['body corporate', 'strata', 'levy', 'owners corporation'],
    'borrowing-expenses': ['borrowing expense', 'borrowing cost', 'loan cost'],
    'cleaning': ['clean', 'cleaning'],
    'variable-outgoings-paid': ['outgoings paid', 'variable outgoings paid'],
    'utility-levy': ['utility levy', 'utility charge'],
    'internet': ['internet', 'broadband', 'nbn'],

    // Cost (capital)
    'purchase-cost': ['purchase cost', 'purchase price', 'acquisition'],
    'stamp-duty': ['stamp duty', 'transfer duty'],
    'conveyancer-fees': ['conveyancer', 'conveyancing fee', 'settlement fee'],
};

// ============ HELPERS ============

const cleanAmount = (str: string): string => str.replace(/[$,\s]/g, "");

const determineCategory = (description: string): string => {
    const lower = description.toLowerCase();
    for (const [category, keywords] of Object.entries(CATEGORY_MAP)) {
        if (keywords.some(k => lower.includes(k))) {
            return category;
        }
    }
    return 'other';
};

const isIncomeContext = (line: string): boolean => {
    const lower = line.toLowerCase();
    return lower.includes('rent') ||
        lower.includes('income') ||
        lower.includes('credit') ||
        lower.includes('deposit');
};

// ============ MAIN PARSER ============

export function extractData(text: string): ExtractedData {
    console.log("------- OCR PARSER v5.0 START -------");
    console.log("Text length:", text.length);

    const lines = text.split("\n");
    const properties: PropertySection[] = [];
    let currentProperty: PropertySection | null = null;

    // Date Regex Patterns
    // Supports: DD/MM/YYYY, DD-MM-YYYY, DD Mon YYYY, DD Month YYYY
    const dateRegexStr = "(\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4}|\\d{1,2}\\s+[a-zA-Z]{3,9}\\s+\\d{2,4})";

    // Run date extraction on the FULL TEXT to support multi-line headers
    // e.g. "Statement period\n1 Feb 2025 - 28 Feb 2025"

    // We used to use [^\\d]*? but that fails if there are digits in the label or noise. 
    // Now we use a broader window but safer.
    const statementDatePattern = new RegExp(`(?:Statement Date|Statement date|Created|Invoice Date|Invoice date)[\\s\\S]{0,50}?(${dateRegexStr})`, 'i');
    const startDatePattern = new RegExp(`(?:Start Date|Start date|From|Subscription Start)[\\s\\S]{0,50}?(${dateRegexStr})`, 'i');
    const endDatePattern = new RegExp(`(?:End Date|End date|To|Due Date|Due date)[\\s\\S]{0,50}?(${dateRegexStr})`, 'i');

    // Period pattern: allows "Statement period", "Period", and separators like "-", "–", "—", "to"
    const periodPattern = new RegExp(
        `(?:Statement Period|Period|Statement period|Subscription Period)[\\s\\S]{0,50}?(${dateRegexStr})\\s*(?:to|-|–|—)\\s*(${dateRegexStr})`,
        'i'
    );

    let statementDate: string | null = null;
    let startDate: string | null = null;
    let endDate: string | null = null;

    // 1. Try Specific Regex Patterns First
    const statementDateMatch = text.match(statementDatePattern);
    if (statementDateMatch) {
        console.log(`FOUND STATEMENT DATE (Specific): ${statementDateMatch[1]}`);
        statementDate = statementDateMatch[1];
    }

    const startDateMatch = text.match(startDatePattern);
    if (startDateMatch) {
        console.log(`FOUND START DATE (Specific): ${startDateMatch[1]}`);
        startDate = startDateMatch[1];
    }

    const endDateMatch = text.match(endDatePattern);
    if (endDateMatch) {
        console.log(`FOUND END DATE (Specific): ${endDateMatch[1]}`);
        endDate = endDateMatch[1];
    }

    const periodMatch = text.match(periodPattern);
    if (periodMatch) {
        console.log(`FOUND PERIOD (Specific): ${periodMatch[1]} to ${periodMatch[2]}`);
        startDate = periodMatch[1];
        endDate = periodMatch[2];
        if (!statementDate) statementDate = endDate;
    }

    // 2. Smart Fallback: If dates are missing, find ALL dates and infer
    if (!statementDate || !startDate || !endDate) {
        console.log("Strict date matching failed or incomplete. Attempting smart fallback...");

        // Find all valid date strings in the text
        const allDateMatches = Array.from(text.matchAll(new RegExp(dateRegexStr, 'gi')))
            .map(m => m[0])
            .filter(d => d.length > 5); // Simple noise filter

        if (allDateMatches.length > 0) {
            // Helper to parse dates for sorting
            const parseDate = (dStr: string) => {
                const clean = dStr.replace(/[/-]/g, ' ').trim();
                return new Date(clean).getTime();
            };

            // Dedup and sort
            const uniqueDates = Array.from(new Set(allDateMatches));
            const sortedDates = uniqueDates
                .map(d => ({ raw: d, ts: parseDate(d) }))
                .filter(d => !isNaN(d.ts))
                .sort((a, b) => a.ts - b.ts);

            if (sortedDates.length >= 2) {
                // Chronological inference
                const first = sortedDates[0].raw;
                const last = sortedDates[sortedDates.length - 1].raw;

                if (!startDate) {
                    startDate = first;
                    console.log(`FALLBACK START DATE: ${startDate}`);
                }
                if (!endDate) {
                    endDate = last;
                    console.log(`FALLBACK END DATE: ${endDate}`);
                }
                if (!statementDate) {
                    statementDate = last; // Statement date usually at end
                    console.log(`FALLBACK STATEMENT DATE: ${statementDate}`);
                }
            } else if (sortedDates.length === 1) {
                const onlyDate = sortedDates[0].raw;
                if (!statementDate) statementDate = onlyDate;
                if (!endDate) endDate = onlyDate;
                // Leave start date null (will default to 1st of month in UI)
            }
        }
    }

    // STRICT Amount Pattern: Requires $ prefix OR decimal .XX suffix
    // This excludes: years (2023), postcodes (5098), phone numbers
    const strictAmountPattern = /(\$\s*[\d,]+(?:\.\d{2})?|[\d,]+\.\d{2})/g;

    // Property address pattern: matches addresses like "1/35 Hurley St, Pimpama QLD" or "2a/35 Hurley St, Pimpama QLD"
    // Pattern: optional unit/apt number, street number, street name, suburb, state
    const propertyAddressPattern = /^(\d+[a-z]?\/?\s*\d+\s+[A-Za-z\s]+(?:St|Street|Rd|Road|Ave|Avenue|Dr|Drive|Ct|Court|Pl|Place|Way|Ln|Lane|Blvd|Boulevard|Cres|Crescent|Pde|Parade|Tce|Terrace|Hwy|Highway)[,\s]+[A-Za-z\s]+(?:NSW|VIC|QLD|SA|WA|TAS|NT|ACT|New South Wales|Victoria|Queensland|South Australia|Western Australia|Tasmania|Northern Territory|Australian Capital Territory))/i;

    // Normalize property name for matching (remove extra spaces, normalize commas)
    const normalizePropertyName = (name: string): string => {
        return name
            .trim()
            .replace(/\s+/g, ' ') // Multiple spaces to single space
            .replace(/,\s*/g, ', ') // Normalize comma spacing
            .toLowerCase();
    };

    const getOrCreateProperty = (name: string): PropertySection => {
        const normalized = normalizePropertyName(name);

        // Try to find existing property by normalized name match
        let prop = properties.find(p => normalizePropertyName(p.propertyName) === normalized);

        if (!prop) {
            prop = {
                propertyName: name, // Keep original name for display
                lineItems: [],
                subtotalMoneyOut: null,
                subtotalMoneyIn: null,
            };
            properties.push(prop);
        }
        return prop;
    };

    // Helper to detect if a line looks like a property address
    const detectPropertyAddress = (line: string): string | null => {
        const trimmed = line.trim();

        // Check if line matches property address pattern
        if (propertyAddressPattern.test(trimmed)) {
            return trimmed;
        }

        // Also check for simpler patterns: unit/street number + street name + suburb + state
        // Pattern: number(s) + street name + comma + suburb + state abbreviation
        const simpleAddressPattern = /^(\d+[a-z]?\/?\s*\d+\s+[A-Za-z\s]+,\s*[A-Za-z\s]+(?:NSW|VIC|QLD|SA|WA|TAS|NT|ACT))/i;
        if (simpleAddressPattern.test(trimmed)) {
            return trimmed;
        }

        // Check for lines that look like property headers (no amounts, contains address-like text)
        const amounts = trimmed.match(strictAmountPattern);
        if (!amounts || amounts.length === 0) {
            // No amounts - could be a property header
            // Check if it contains address-like elements
            const hasStreetNumber = /\d+[a-z]?\/?\s*\d+/.test(trimmed);
            const hasStreetName = /(?:St|Street|Rd|Road|Ave|Avenue|Dr|Drive|Ct|Court|Pl|Place|Way|Ln|Lane|Blvd|Boulevard|Cres|Crescent|Pde|Parade|Tce|Terrace|Hwy|Highway)/i.test(trimmed);
            const hasState = /(?:NSW|VIC|QLD|SA|WA|TAS|NT|ACT|New South Wales|Victoria|Queensland|South Australia|Western Australia|Tasmania|Northern Territory|Australian Capital Territory)/i.test(trimmed);

            if (hasStreetNumber && (hasStreetName || hasState) && trimmed.length > 10 && trimmed.length < 100) {
                return trimmed;
            }
        }

        return null;
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const lowerLine = line.toLowerCase();

        if (!line || line.length < 5) continue;



        // ======== SKIP RULES ========

        // Skip summary/total lines
        const isSummaryLine =
            lowerLine.includes('total') ||
            lowerLine.includes('subtotal') ||
            lowerLine.includes('balance') ||
            lowerLine.includes('folio summary') ||
            lowerLine.includes('balance brought') ||
            lowerLine.includes('balance carried') ||
            lowerLine.includes('payments to owner') ||
            lowerLine.includes('total income') ||
            lowerLine.includes('total expense') ||
            lowerLine.includes('includes gst') ||
            lowerLine.includes('gst of');

        if (isSummaryLine) {
            console.log(`SKIP (summary): "${line.substring(0, 50)}"`);
            continue;
        }

        // Skip header lines
        const isHeaderLine =
            lowerLine.includes('money in') && lowerLine.includes('money out') ||
            lowerLine.includes('credit') && lowerLine.includes('debit') && line.length < 30 ||
            lowerLine === 'income' ||
            lowerLine === 'expenses' ||
            lowerLine === 'account' ||
            lowerLine.includes('statement period') ||
            lowerLine.includes('page') && /\d+\s*(of|\/)\s*\d+/.test(lowerLine);

        if (isHeaderLine) {
            console.log(`SKIP (header): "${line.substring(0, 50)}"`);
            continue;
        }

        // Skip metadata lines (ABN, license, address header)
        const isMetadataLine =
            /^abn:?\s*\d/i.test(line) ||
            /^licen[sc]e/i.test(line) ||
            /^copyright/i.test(line) ||
            /^created:/i.test(line) ||
            /^page\s+\d/i.test(line);

        if (isMetadataLine) {
            console.log(`SKIP (metadata): "${line.substring(0, 50)}"`);
            continue;
        }

        // Skip rent rate/frequency lines (these are rules, not transactions)
        // e.g. "Rent: $520.00 Weekly", "$1,200 per month"
        const isRentRateLine =
            lowerLine.includes('weekly') ||
            lowerLine.includes('fortnightly') ||
            lowerLine.includes('monthly') ||
            lowerLine.includes('per week') ||
            lowerLine.includes('per month') ||
            lowerLine.includes('per fortnight') ||
            lowerLine.includes('p/w') ||
            lowerLine.includes('p/m') ||
            lowerLine.includes('current tenancy') ||
            lowerLine.includes('paid to:');

        if (isRentRateLine) {
            console.log(`SKIP (rent rate): "${line.substring(0, 50)}"`);
            continue;
        }

        // ======== DETECT PROPERTY ADDRESS ========
        // Check if this line is a property address/header (before checking for amounts)
        const detectedPropertyAddress = detectPropertyAddress(line);
        if (detectedPropertyAddress) {
            // This is a property header - switch to/create this property section
            currentProperty = getOrCreateProperty(detectedPropertyAddress);
            console.log(`PROPERTY DETECTED: "${detectedPropertyAddress}"`);
            continue; // Skip this line as it's not a transaction
        }

        // ======== FIND AMOUNTS ========

        const amounts = line.match(strictAmountPattern);
        if (!amounts || amounts.length === 0) continue;

        // Parse and validate amounts
        const validAmounts = amounts
            .map(a => ({ raw: a, value: parseFloat(cleanAmount(a)) }))
            .filter(a => !isNaN(a.value) && a.value >= 1 && a.value < 1000000);

        if (validAmounts.length === 0) continue;

        // Skip if line has 3+ amounts (likely a summary row with In/Out/Balance)
        if (validAmounts.length >= 3) {
            console.log(`SKIP (3+ amounts): "${line.substring(0, 50)}"`);
            continue;
        }

        // ======== EXTRACT DESCRIPTION ========

        let description = line;
        for (const amt of amounts) {
            description = description.replace(amt, ' ');
        }
        description = description
            .replace(/\s+/g, ' ')
            .replace(/^[-–—:\s]+/, '')
            .replace(/[-–—:\s]+$/, '')
            .trim();

        // Validate description
        const letters = description.replace(/[^a-zA-Z]/g, '');
        if (letters.length < 3) {
            console.log(`SKIP (short desc): "${description}"`);
            continue;
        }

        // Skip date-only lines
        if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(description)) {
            console.log(`SKIP (date): "${description}"`);
            continue;
        }

        // ======== DETERMINE TYPE ========

        const isIncome = isIncomeContext(line);
        const primaryAmount = validAmounts[validAmounts.length - 1];

        // Check for tax value (smaller amount before main amount)
        let taxValue: string | null = null;
        if (validAmounts.length === 2) {
            const first = validAmounts[0].value;
            const second = validAmounts[1].value;
            // If first amount is smaller (likely GST)
            if (first < second && first < second * 0.2) {
                taxValue = first.toFixed(2);
            }
        }

        // ======== CREATE TRANSACTION ========

        if (!currentProperty) {
            currentProperty = getOrCreateProperty("Extracted Transactions");
        }

        const category = determineCategory(description);

        console.log(`FOUND: "${description}" = $${primaryAmount.value.toFixed(2)} [${isIncome ? 'INCOME' : 'EXPENSE'}] -> ${category}`);

        currentProperty.lineItems.push({
            description,
            includedTax: taxValue,
            moneyIn: isIncome ? primaryAmount.value.toFixed(2) : null,
            moneyOut: !isIncome ? primaryAmount.value.toFixed(2) : null,
            confidence: 90,
            category,
        });
    }



    // ======== RESULTS ========

    const totalTransactions = properties.reduce((sum, p) => sum + p.lineItems.length, 0);
    console.log("------- OCR PARSER v5.0 RESULT -------");
    console.log(`Extracted ${totalTransactions} transactions`);
    console.log(`Dates: Statement=${statementDate}, Start=${startDate}, End=${endDate}`);

    return {
        agencyName: null,
        folioNumber: null,
        statementPeriod: {
            from: startDate,
            to: endDate || statementDate // Use statement date as fallback for 'to'
        },
        statementDate, // Return the explicit statement date
        properties,
        totalMoneyIn: null,
        totalMoneyOut: null,
        rawText: text,
    };
}
