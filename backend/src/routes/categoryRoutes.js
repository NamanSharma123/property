const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

/**
 * @route   GET /api/categories
 * @desc    Get all categories
 * @access  Private
 */
router.get('/', categoryController.getCategories);

/**
 * @route   POST /api/categories
 * @desc    Create custom category
 * @access  Private
 */
router.post('/', categoryController.createCategory);

/**
 * @route   PUT /api/categories/:id
 * @desc    Update custom category
 * @access  Private
 */
router.put('/:id', categoryController.updateCategory);

/**
 * @route   DELETE /api/categories/:id
 * @desc    Delete custom category
 * @access  Private
 */
router.delete('/:id', categoryController.deleteCategory);

module.exports = router;
