const express = require('express');
const router = express.Router();
const ocrController = require('../controllers/ocrController');
const { upload, extractText, extractPDFText } = require('../controllers/pdfController');
const { protect } = require('../middleware/authMiddleware');

// All OCR routes require authentication
router.use(protect);

/**
 * @route POST /api/ocr/extract
 * @desc Extract text from any uploaded file (PDF or image)
 * @access Private
 */
router.post('/extract', upload.single('file'), extractText);

/**
 * @route POST /api/ocr/extract-pdf
 * @desc Extract text from uploaded PDF file (backward compatibility)
 * @access Private
 */
router.post('/extract-pdf', upload.single('pdf'), extractPDFText);

/**
 * @route POST /api/ocr/upload
 * @desc Upload a document for OCR processing
 * @access Private
 */
router.post('/upload', ocrController.uploadDocument);

/**
 * @route POST /api/ocr/process
 * @desc Process uploaded document with OCR extraction results
 * @access Private
 */
router.post('/process', ocrController.processDocument);

/**
 * @route GET /api/ocr/documents
 * @desc Get all documents (with optional filters)
 * @access Private
 */
router.get('/documents', ocrController.getDocuments);

/**
 * @route GET /api/ocr/document/:id
 * @desc Get a specific document with extracted data
 * @access Private
 */
router.get('/document/:id', ocrController.getDocumentById);

/**
 * @route POST /api/ocr/convert-to-transactions
 * @desc Convert line items to transactions
 * @access Private
 */
router.post('/convert-to-transactions', ocrController.convertToTransactions);

/**
 * @route PUT /api/ocr/correct/:id
 * @desc Correct extracted data value (user feedback)
 * @access Private
 */
router.put('/correct/:id', ocrController.correctExtractedData);

/**
 * @route DELETE /api/ocr/document/:id
 * @desc Delete a document
 * @access Private
 */
router.delete('/document/:id', ocrController.deleteDocument);

module.exports = router;

