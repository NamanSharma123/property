/**
 * Unified OCR Controller
 * Handles both PDF text extraction and image OCR on the backend
 * 
 * - PDFs: Uses pdf-parse for text extraction (fast, no OCR)
 * - Images: Uses Tesseract.js for OCR
 * - Both: Uses extractData parser to return structured transaction data
 */

const multer = require('multer');
const pdfParse = require('pdf-parse');
const Tesseract = require('tesseract.js');

// Configure multer for file upload (memory storage)
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 20 * 1024 * 1024, // 20MB max
    },
    fileFilter: (req, file, cb) => {
        const allowedMimes = [
            'application/pdf',
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/webp',
            'image/gif'
        ];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only PDF and image files are allowed'), false);
        }
    },
});

// ============ CATEGORY MAPPING ============
const CATEGORY_MAP = {
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

const cleanAmount = (str) => str.replace(/[$,\s]/g, "");

const determineCategory = (description) => {
    const lower = description.toLowerCase();
    for (const [category, keywords] of Object.entries(CATEGORY_MAP)) {
        if (keywords.some(k => lower.includes(k))) {
            return category;
        }
    }
    return 'other';
};

const isIncomeContext = (line) => {
    const lower = line.toLowerCase();
    return lower.includes('rent') ||
        lower.includes('income') ||
        lower.includes('credit') ||
        lower.includes('deposit');
};

// ============ MAIN PARSER ============

/**
 * Extract structured data from OCR text
 * Based on OCR-model-test reference implementation
 */
function extractData(text) {
    console.log("------- OCR PARSER v5.0 START -------");
    console.log("Text length:", text.length);

    const lines = text.split("\n");
    const properties = [];
    let currentProperty = null;

    // Date Regex Patterns
    // Supports: DD/MM/YYYY, DD-MM-YYYY, DD Mon YYYY, DD Month YYYY
    const dateRegexStr = "(\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4}|\\d{1,2}\\s+[a-zA-Z]{3,9}\\s+\\d{2,4})";

    // Run date extraction on the FULL TEXT to support multi-line headers
    const statementDatePattern = new RegExp(`(?:Statement Date|Statement date|Created|Invoice Date|Invoice date)[\\s\\S]{0,50}?(${dateRegexStr})`, 'i');
    const startDatePattern = new RegExp(`(?:Start Date|Start date|From|Subscription Start)[\\s\\S]{0,50}?(${dateRegexStr})`, 'i');
    const endDatePattern = new RegExp(`(?:End Date|End date|To|Due Date|Due date)[\\s\\S]{0,50}?(${dateRegexStr})`, 'i');
    const periodPattern = new RegExp(
        `(?:Statement Period|Period|Statement period|Subscription Period)[\\s\\S]{0,50}?(${dateRegexStr})\\s*(?:to|-|–|—)\\s*(${dateRegexStr})`,
        'i'
    );

    let statementDate = null;
    let startDate = null;
    let endDate = null;

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
        const allDateMatches = [];
        const globalRegex = new RegExp(dateRegexStr, 'gi');
        let m;
        while ((m = globalRegex.exec(text)) !== null) {
            if (m[0].length > 5) allDateMatches.push(m[0]);
        }

        if (allDateMatches.length > 0) {
            // Helper to parse dates for sorting
            const parseDate = (dStr) => {
                const clean = dStr.replace(/[/-]/g, ' ').trim();
                return new Date(clean).getTime();
            };

            // Dedup and sort
            const uniqueDates = [...new Set(allDateMatches)];
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
            }
        }
    }

    // STRICT Amount Pattern: Requires $ prefix OR decimal .XX suffix
    const strictAmountPattern = /(\$\s*[\d,]+(?:\.\d{2})?|[\d,]+\.\d{2})/g;

    const getOrCreateProperty = (name) => {
        let prop = properties.find(p => p.propertyName === name);
        if (!prop) {
            prop = {
                propertyName: name,
                lineItems: [],
                subtotalMoneyOut: null,
                subtotalMoneyIn: null,
            };
            properties.push(prop);
        }
        return prop;
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const lowerLine = line.toLowerCase();

        if (!line || line.length < 5) continue;

        // Skip date extraction inside loop (already done globally)

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
            (lowerLine.includes('money in') && lowerLine.includes('money out')) ||
            (lowerLine.includes('credit') && lowerLine.includes('debit') && line.length < 30) ||
            lowerLine === 'income' ||
            lowerLine === 'expenses' ||
            lowerLine === 'account' ||
            lowerLine.includes('statement period') ||
            (lowerLine.includes('page') && /\d+\s*(of|\/)\s*\d+/.test(lowerLine));

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

        // Skip rent rate/frequency lines
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

        // ======== FIND AMOUNTS ========

        const amounts = line.match(strictAmountPattern);
        if (!amounts || amounts.length === 0) continue;

        // Parse and validate amounts
        const validAmounts = amounts
            .map(a => ({ raw: a, value: parseFloat(cleanAmount(a)) }))
            .filter(a => !isNaN(a.value) && a.value >= 1 && a.value < 1000000);

        if (validAmounts.length === 0) continue;

        // Skip if line has 3+ amounts (likely a summary row)
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
        let taxValue = null;
        if (validAmounts.length === 2) {
            const first = validAmounts[0].value;
            const second = validAmounts[1].value;
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
        properties,
        totalMoneyIn: null,
        totalMoneyOut: null,
        rawText: text,
    };
}

/**
 * @route POST /api/ocr/extract
 * @desc Extract text from uploaded file (PDF or image) and return structured data
 * @access Private
 */
const extractText = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded',
            });
        }

        const { buffer, mimetype, originalname, size } = req.file;
        console.log(`Processing file: ${originalname}, Type: ${mimetype}, Size: ${size}`);

        let text = '';
        let method = '';
        let pageCount = 1;
        let confidence = 90;

        try {
            if (mimetype === 'application/pdf') {
                // PDF Handling: Use pdf-parse for text extraction
                console.log('Extracting text from PDF...');
                method = 'pdf-parse';

                // pdf-parse API: function takes buffer directly
                const pdfData = await pdfParse(buffer);
                text = pdfData.text;
                pageCount = pdfData.numpages || 1;

                if (!text || text.trim().length < 10) {
                    console.log('PDF appears to be scanned (minimal text extracted)');
                    return res.json({
                        success: true,
                        isScanned: true,
                        text: '',
                        pageCount,
                        method,
                        message: 'This PDF appears to be scanned. Please convert it to images (PNG/JPG) for OCR processing.',
                    });
                }

                console.log(`PDF text extracted: ${text.length} characters from ${pageCount} pages`);

            } else {
                // Image Handling: Use Tesseract OCR
                console.log('Using Tesseract OCR for image analysis...');
                method = 'tesseract';

                const worker = await Tesseract.createWorker('eng');
                const result = await worker.recognize(buffer);
                text = result.data.text;
                confidence = result.data.confidence;
                await worker.terminate();

                console.log(`OCR complete: ${text.length} characters, ${confidence}% confidence`);

                if (!text || text.trim().length < 10) {
                    return res.json({
                        success: false,
                        error: 'Could not extract text from image. Please ensure the image is clear and readable.',
                        confidence,
                    });
                }
            }

        } catch (extractError) {
            console.error('Text extraction error:', extractError);
            return res.status(500).json({
                success: false,
                error: 'Text extraction failed: ' + (extractError.message || 'Unknown error'),
            });
        }

        // Clean up the extracted text
        const cleanedText = text
            .replace(/\r\n/g, '\n')
            .replace(/\t/g, ' ')
            .replace(/\s{3,}/g, '  ')
            .trim();

        // Use regex-based parser
        console.log('Using regex parser');
        let result;
        result = extractData(cleanedText);

        // Calculate totals from properties
        let totalMoneyIn = 0;
        let totalMoneyOut = 0;
        for (const prop of result.properties) {
            for (const item of prop.lineItems) {
                if (item.moneyIn) totalMoneyIn += parseFloat(item.moneyIn);
                if (item.moneyOut) totalMoneyOut += parseFloat(item.moneyOut);
            }
        }

        res.json({
            success: true,
            isScanned: false,
            text: cleanedText,
            pageCount,
            method,
            originalFilename: originalname,
            confidence,

            // Structured transaction data (for frontend ExpenseClassifier)
            extractedData: {
                agencyName: result.agencyName,
                folioNumber: result.folioNumber,
                statementPeriod: result.statementPeriod,
                properties: result.properties,
                totalMoneyIn: totalMoneyIn.toFixed(2),
                totalMoneyOut: totalMoneyOut.toFixed(2),
            },

            // Summary fields for quick access
            vendor: result.agencyName || "Unknown Vendor",
            amount: totalMoneyOut.toFixed(2),
            category: "Uncategorized",
            expenseDate: result.statementPeriod.to || result.statementPeriod.from || "",
            property: result.properties?.[0]?.propertyName || "",
            propertyType: "",
            description: "",

            // Transaction count for UI feedback
            transactionCount: result.properties.reduce((sum, p) => sum + p.lineItems.length, 0),
        });

    } catch (error) {
        console.error('OCR endpoint error:', error);
        res.status(500).json({
            success: false,
            error: 'Processing failed: ' + (error.message || 'Unknown error'),
        });
    }
};

// Keep the old PDF-only endpoint for backward compatibility
const extractPDFText = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No PDF file uploaded',
            });
        }

        console.log('Processing PDF:', req.file.originalname, 'Size:', req.file.size);

        // pdf-parse API: function takes buffer directly
        const pdfData = await pdfParse(req.file.buffer);
        const text = pdfData.text;
        const pageCount = pdfData.numpages || 1;

        if (!text || text.trim().length < 20) {
            return res.status(200).json({
                success: true,
                isScanned: true,
                text: '',
                pageCount,
                message: 'PDF appears to be scanned (no extractable text). Please convert to images for OCR.',
            });
        }

        console.log('PDF extracted successfully:', { pages: pageCount, textLength: text.length });

        // Extract structured data using parser
        const result = extractData(text.trim());

        res.json({
            success: true,
            isScanned: false,
            text: text.trim(),
            pageCount,
            extractedData: result,
        });

    } catch (error) {
        console.error('PDF extraction error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process PDF: ' + (error.message || 'Unknown error'),
        });
    }
};

module.exports = {
    upload,
    extractText,
    extractPDFText,
    extractData, // Export parser for testing
};
