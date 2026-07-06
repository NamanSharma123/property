const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

/**
 * @route   GET /api/expenses
 * @desc    Get all expenses
 * @access  Private
 */
router.get('/', expenseController.getExpenses);

/**
 * @route   GET /api/expenses/stats
 * @desc    Get expense statistics
 * @access  Private
 */
router.get('/stats', expenseController.getExpenseStats);

/**
 * @route   GET /api/expenses/:id
 * @desc    Get single expense
 * @access  Private
 */
router.get('/:id', expenseController.getExpense);

/**
 * @route   POST /api/expenses
 * @desc    Create new expense
 * @access  Private
 */
router.post('/', expenseController.createExpense);

/**
 * @route   PUT /api/expenses/:id
 * @desc    Update expense
 * @access  Private
 */
router.put('/:id', expenseController.updateExpense);

/**
 * @route   DELETE /api/expenses/:id
 * @desc    Delete expense
 * @access  Private
 */
router.delete('/:id', expenseController.deleteExpense);

module.exports = router;
