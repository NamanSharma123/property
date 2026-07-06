const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

/**
 * @route   GET /api/transactions
 * @desc    Get all transactions
 * @access  Private
 */
router.get('/', transactionController.getTransactions);

/**
 * @route   GET /api/transactions/stats
 * @desc    Get transaction statistics
 * @access  Private
 */
router.get('/stats', transactionController.getTransactionStats);

/**
 * @route   GET /api/transactions/monthly
 * @desc    Get monthly breakdown
 * @access  Private
 */
router.get('/monthly', transactionController.getMonthlyBreakdown);

/**
 * @route   GET /api/transactions/:id
 * @desc    Get single transaction
 * @access  Private
 */
router.get('/:id', transactionController.getTransaction);

/**
 * @route   POST /api/transactions
 * @desc    Create new transaction
 * @access  Private
 */
router.post('/', transactionController.createTransaction);

/**
 * @route   PUT /api/transactions/:id
 * @desc    Update transaction
 * @access  Private
 */
router.put('/:id', transactionController.updateTransaction);

/**
 * @route   DELETE /api/transactions/:id
 * @desc    Delete transaction
 * @access  Private
 */
router.delete('/:id', transactionController.deleteTransaction);

module.exports = router;
