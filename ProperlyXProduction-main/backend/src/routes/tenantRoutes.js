const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenantController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

/**
 * @route   GET /api/tenants
 * @desc    Get all tenants
 * @access  Private
 */
router.get('/', tenantController.getTenants);

/**
 * @route   GET /api/tenants/stats
 * @desc    Get tenant statistics
 * @access  Private
 */
router.get('/stats', tenantController.getTenantStats);

/**
 * @route   GET /api/tenants/:id
 * @desc    Get single tenant
 * @access  Private
 */
router.get('/:id', tenantController.getTenant);

/**
 * @route   POST /api/tenants
 * @desc    Create new tenant
 * @access  Private
 */
router.post('/', tenantController.createTenant);

/**
 * @route   PUT /api/tenants/:id
 * @desc    Update tenant
 * @access  Private
 */
router.put('/:id', tenantController.updateTenant);

/**
 * @route   DELETE /api/tenants/:id
 * @desc    Delete tenant
 * @access  Private
 */
router.delete('/:id', tenantController.deleteTenant);

module.exports = router;
