const express = require('express');
const router = express.Router();
const propertyController = require('../controllers/propertyController');
const { protect } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

/**
 * @route   GET /api/properties
 * @desc    Get all properties for user
 * @access  Private
 */
router.get('/', propertyController.getProperties);

/**
 * @route   GET /api/properties/stats
 * @desc    Get property statistics
 * @access  Private
 */
router.get('/stats', propertyController.getPropertyStats);

/**
 * @route   GET /api/properties/:id
 * @desc    Get single property
 * @access  Private
 */
router.get('/:id', propertyController.getProperty);

/**
 * @route   POST /api/properties
 * @desc    Create new property
 * @access  Private
 */
router.post('/', propertyController.createProperty);

/**
 * @route   PUT /api/properties/:id
 * @desc    Update property
 * @access  Private
 */
router.put('/:id', propertyController.updateProperty);

/**
 * @route   DELETE /api/properties/:id
 * @desc    Delete property
 * @access  Private
 */
router.delete('/:id', propertyController.deleteProperty);

module.exports = router;
