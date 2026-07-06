const db = require('../config/db');
const crypto = require('crypto');

/**
 * OCR Controller
 * Handles document upload, processing, extraction, and conversion to transactions
 */

/**
 * @route POST /api/ocr/upload
 * @desc Upload a document for OCR processing
 */
const uploadDocument = async (req, res) => {
    const client = await db.getClient();
    try {
        const { fileName, fileUrl, fileType, fileSize, propertyId } = req.body;
        const ownerId = req.user.id;

        // Validate required fields
        if (!fileName || !fileUrl || !fileType || !fileSize) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: fileName, fileUrl, fileType, fileSize'
            });
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
        if (!allowedTypes.includes(fileType)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid file type. Allowed: JPEG, PNG, PDF'
            });
        }

        // Generate file hash for duplicate detection
        const fileHash = crypto.createHash('sha256').update(fileUrl + fileName).digest('hex');

        // Check for exact duplicate
        const duplicateCheck = await client.query(
            `SELECT dd.id, dd.original_document_id, d.file_name 
             FROM document_duplicates dd
             JOIN documents d ON dd.original_document_id = d.id
             WHERE dd.file_hash = $1 AND dd.owner_id = $2
             LIMIT 1`,
            [fileHash, ownerId]
        );

        if (duplicateCheck.rows.length > 0) {
            return res.status(409).json({
                success: false,
                error: 'Duplicate document detected',
                original_document: duplicateCheck.rows[0]
            });
        }

        // Create document record
        const result = await client.query(
            `INSERT INTO documents 
             (owner_id, property_id, file_name, file_url, file_type, file_size, status)
             VALUES ($1, $2, $3, $4, $5, $6, 'pending')
             RETURNING *`,
            [ownerId, propertyId || null, fileName, fileUrl, fileType, fileSize]
        );

        const document = result.rows[0];

        // Store file hash for future duplicate detection
        await client.query(
            `INSERT INTO document_duplicates 
             (owner_id, file_hash, document_signature, original_document_id, detection_type)
             VALUES ($1, $2, $3, $4, 'exact-hash')`,
            [ownerId, fileHash, JSON.stringify({ fileName, fileSize }), document.id]
        );

        res.status(201).json({
            success: true,
            message: 'Document uploaded successfully',
            document
        });

    } catch (error) {
        console.error('Upload document error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to upload document'
        });
    } finally {
        client.release();
    }
};

/**
 * @route POST /api/ocr/process
 * @desc Process a document with OCR and extract data
 */
const processDocument = async (req, res) => {
    const client = await db.getClient();
    try {
        const { documentId, ocrRawText, extractedData, lineItems, ocrConfidence, documentType } = req.body;
        const ownerId = req.user.id;

        // Validate document ownership
        const docCheck = await client.query(
            'SELECT * FROM documents WHERE id = $1 AND owner_id = $2',
            [documentId, ownerId]
        );

        if (docCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Document not found or access denied'
            });
        }

        // Update document with OCR results
        await client.query(
            `UPDATE documents 
             SET status = 'completed', 
                 ocr_raw_text = $1, 
                 ocr_confidence = $2,
                 document_type = $3,
                 processing_started_at = NOW(),
                 processing_completed_at = NOW()
             WHERE id = $4`,
            [ocrRawText, ocrConfidence, documentType || 'unknown', documentId]
        );

        // Store extracted data fields
        if (extractedData && typeof extractedData === 'object') {
            for (const [fieldName, fieldValue] of Object.entries(extractedData)) {
                if (fieldValue !== null && fieldValue !== undefined) {
                    await client.query(
                        `INSERT INTO extracted_data 
                         (document_id, field_name, field_value, confidence, data_type)
                         VALUES ($1, $2, $3, $4, $5)`,
                        [documentId, fieldName, String(fieldValue), ocrConfidence, 'string']
                    );
                }
            }
        }

        // Store line items
        if (lineItems && Array.isArray(lineItems)) {
            for (const item of lineItems) {
                await client.query(
                    `INSERT INTO document_line_items 
                     (document_id, property_name, description, category, amount, item_type, included_tax, confidence)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                    [
                        documentId,
                        item.propertyName || null,
                        item.description,
                        item.category || null,
                        parseFloat(item.amount) || 0,
                        item.itemType || 'expense',
                        parseFloat(item.includedTax) || null,
                        item.confidence || ocrConfidence
                    ]
                );
            }
        }

        res.json({
            success: true,
            message: 'Document processed successfully',
            documentId
        });

    } catch (error) {
        console.error('Process document error:', error);

        // Update document status to failed
        try {
            await client.query(
                `UPDATE documents SET status = 'failed', error_message = $1 WHERE id = $2`,
                [error.message, req.body.documentId]
            );
        } catch (updateError) {
            console.error('Failed to update document status:', updateError);
        }

        res.status(500).json({
            success: false,
            error: 'Failed to process document'
        });
    } finally {
        client.release();
    }
};

/**
 * @route GET /api/ocr/documents
 * @desc Get all documents for the authenticated user
 */
const getDocuments = async (req, res) => {
    const client = await db.getClient();
    try {
        const ownerId = req.user.id;
        const { status, propertyId, documentType, limit = 50, offset = 0 } = req.query;

        let query = `
            SELECT d.*, p.name as property_name
            FROM documents d
            LEFT JOIN properties p ON d.property_id = p.id
            WHERE d.owner_id = $1
        `;
        const params = [ownerId];
        let paramCount = 1;

        if (status) {
            paramCount++;
            query += ` AND d.status = $${paramCount}`;
            params.push(status);
        }

        if (propertyId) {
            paramCount++;
            query += ` AND d.property_id = $${paramCount}`;
            params.push(propertyId);
        }

        if (documentType) {
            paramCount++;
            query += ` AND d.document_type = $${paramCount}`;
            params.push(documentType);
        }

        query += ` ORDER BY d.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        params.push(limit, offset);

        const result = await client.query(query, params);

        res.json({
            success: true,
            documents: result.rows,
            count: result.rows.length
        });

    } catch (error) {
        console.error('Get documents error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch documents'
        });
    } finally {
        client.release();
    }
};

/**
 * @route GET /api/ocr/document/:id
 * @desc Get a specific document with all extracted data
 */
const getDocumentById = async (req, res) => {
    const client = await db.getClient();
    try {
        const { id } = req.params;
        const ownerId = req.user.id;

        // Get document
        const docResult = await client.query(
            `SELECT d.*, p.name as property_name
             FROM documents d
             LEFT JOIN properties p ON d.property_id = p.id
             WHERE d.id = $1 AND d.owner_id = $2`,
            [id, ownerId]
        );

        if (docResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Document not found'
            });
        }

        const document = docResult.rows[0];

        // Get extracted data
        const extractedDataResult = await client.query(
            'SELECT * FROM extracted_data WHERE document_id = $1 ORDER BY created_at',
            [id]
        );

        // Get line items
        const lineItemsResult = await client.query(
            'SELECT * FROM document_line_items WHERE document_id = $1 ORDER BY line_number, created_at',
            [id]
        );

        res.json({
            success: true,
            document: {
                ...document,
                extractedData: extractedDataResult.rows,
                lineItems: lineItemsResult.rows
            }
        });

    } catch (error) {
        console.error('Get document by ID error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch document'
        });
    } finally {
        client.release();
    }
};

/**
 * @route POST /api/ocr/convert-to-transactions
 * @desc Convert line items to transactions
 */
const convertToTransactions = async (req, res) => {
    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        const { documentId, lineItemIds, statementDate } = req.body;
        const ownerId = req.user.id;

        // Validate document ownership
        const docResult = await client.query(
            'SELECT * FROM documents WHERE id = $1 AND owner_id = $2',
            [documentId, ownerId]
        );

        if (docResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                error: 'Document not found'
            });
        }

        const document = docResult.rows[0];
        const createdTransactions = [];

        // Get line items
        const lineItemsResult = await client.query(
            `SELECT * FROM document_line_items 
             WHERE document_id = $1 AND id = ANY($2) AND is_converted = false`,
            [documentId, lineItemIds]
        );

        for (const lineItem of lineItemsResult.rows) {
            // Find or get property
            let propertyId = document.property_id;

            if (!propertyId && lineItem.property_name) {
                // Try to find property by name
                const propResult = await client.query(
                    'SELECT id FROM properties WHERE owner_id = $1 AND name ILIKE $2 LIMIT 1',
                    [ownerId, lineItem.property_name]
                );
                if (propResult.rows.length > 0) {
                    propertyId = propResult.rows[0].id;
                }
            }

            if (!propertyId) {
                console.warn(`Skipping line item ${lineItem.id}: No property found`);
                continue;
            }

            // Create transaction
            const transactionResult = await client.query(
                `INSERT INTO transactions 
                 (owner_id, property_id, description, amount, date, type, category_name, 
                  transaction_source, status, source_document_id, created_by)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, 'OCR Upload', 'pending', $8, $9)
                 RETURNING *`,
                [
                    ownerId,
                    propertyId,
                    lineItem.description,
                    lineItem.amount,
                    statementDate || new Date().toISOString().split('T')[0],
                    lineItem.item_type || 'expense',
                    lineItem.category,
                    documentId,
                    ownerId
                ]
            );

            const transaction = transactionResult.rows[0];
            createdTransactions.push(transaction);

            // Mark line item as converted
            await client.query(
                `UPDATE document_line_items 
                 SET is_converted = true, transaction_id = $1 
                 WHERE id = $2`,
                [transaction.id, lineItem.id]
            );
        }

        await client.query('COMMIT');

        res.json({
            success: true,
            message: `Successfully converted ${createdTransactions.length} line items to transactions`,
            transactions: createdTransactions
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Convert to transactions error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to convert line items to transactions'
        });
    } finally {
        client.release();
    }
};

/**
 * @route PUT /api/ocr/correct/:id
 * @desc Correct extracted data (user feedback loop)
 */
const correctExtractedData = async (req, res) => {
    const client = await db.getClient();
    try {
        const { id } = req.params;
        const { correctedValue } = req.body;
        const ownerId = req.user.id;

        // Get extracted data record
        const dataResult = await client.query(
            `SELECT ed.*, d.owner_id 
             FROM extracted_data ed
             JOIN documents d ON ed.document_id = d.id
             WHERE ed.id = $1`,
            [id]
        );

        if (dataResult.rows.length === 0 || dataResult.rows[0].owner_id !== ownerId) {
            return res.status(404).json({
                success: false,
                error: 'Extracted data not found or access denied'
            });
        }

        const extractedData = dataResult.rows[0];

        // Update with correction
        await client.query(
            `UPDATE extracted_data 
             SET original_value = COALESCE(original_value, field_value),
                 corrected_value = $1,
                 field_value = $1,
                 is_validated = true,
                 validation_status = 'corrected',
                 corrected_by = $2,
                 corrected_at = NOW()
             WHERE id = $3`,
            [correctedValue, ownerId, id]
        );

        res.json({
            success: true,
            message: 'Data corrected successfully'
        });

    } catch (error) {
        console.error('Correct extracted data error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to correct data'
        });
    } finally {
        client.release();
    }
};

/**
 * @route DELETE /api/ocr/document/:id
 * @desc Delete a document and all related data
 */
const deleteDocument = async (req, res) => {
    const client = await db.getClient();
    try {
        const { id } = req.params;
        const ownerId = req.user.id;

        const result = await client.query(
            'DELETE FROM documents WHERE id = $1 AND owner_id = $2 RETURNING *',
            [id, ownerId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Document not found'
            });
        }

        res.json({
            success: true,
            message: 'Document deleted successfully'
        });

    } catch (error) {
        console.error('Delete document error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete document'
        });
    } finally {
        client.release();
    }
};

module.exports = {
    uploadDocument,
    processDocument,
    getDocuments,
    getDocumentById,
    convertToTransactions,
    correctExtractedData,
    deleteDocument
};
