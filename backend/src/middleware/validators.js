const { body, validationResult } = require('express-validator');
const config = require('../config');

/**
 * Handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      errors: errors.array().map((e) => ({
        field: e.path,
        message: e.msg,
      })),
    });
  }
  next();
};

/**
 * Signup validation
 */
const validateSignup = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please enter a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: config.passwordPolicy.minLength })
    .withMessage(`Password must be at least ${config.passwordPolicy.minLength} characters`)
    .custom((value) => {
      const { passwordPolicy } = config;
      if (passwordPolicy.requireUppercase && !/[A-Z]/.test(value)) {
        throw new Error('Password must contain at least one uppercase letter');
      }
      if (passwordPolicy.requireLowercase && !/[a-z]/.test(value)) {
        throw new Error('Password must contain at least one lowercase letter');
      }
      if (passwordPolicy.requireNumbers && !/\d/.test(value)) {
        throw new Error('Password must contain at least one number');
      }
      if (passwordPolicy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(value)) {
        throw new Error('Password must contain at least one special character');
      }
      return true;
    }),
  handleValidationErrors,
];

/**
 * Login validation
 */
const validateLogin = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please enter a valid email')
    .normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors,
];

/**
 * Password change validation
 */
const validatePasswordChange = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: config.passwordPolicy.minLength })
    .withMessage(`Password must be at least ${config.passwordPolicy.minLength} characters`)
    .custom((value, { req }) => {
      if (value === req.body.currentPassword) {
        throw new Error('New password must be different from current password');
      }
      return true;
    }),
  handleValidationErrors,
];

/**
 * Property validation
 */
const validateProperty = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Property name is required')
    .isLength({ max: 200 })
    .withMessage('Property name cannot exceed 200 characters'),
  body('address.street').trim().notEmpty().withMessage('Street address is required'),
  body('address.city').trim().notEmpty().withMessage('City is required'),
  body('address.state').trim().notEmpty().withMessage('State is required'),
  body('address.zipCode').trim().notEmpty().withMessage('Zip code is required'),
  body('units').optional().isInt({ min: 1 }).withMessage('Units must be at least 1'),
  handleValidationErrors,
];

/**
 * Transaction validation
 */
const validateTransaction = [
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('amount').notEmpty().withMessage('Amount is required').isNumeric().withMessage('Amount must be a number'),
  body('type').notEmpty().withMessage('Type is required').isIn(['income', 'expense']).withMessage('Type must be income or expense'),
  body('property').notEmpty().withMessage('Property is required').isMongoId().withMessage('Invalid property ID'),
  body('date').optional().isISO8601().withMessage('Invalid date format'),
  handleValidationErrors,
];

/**
 * Tenant validation
 */
const validateTenant = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Tenant name is required')
    .isLength({ max: 100 })
    .withMessage('Name cannot exceed 100 characters'),
  body('property').notEmpty().withMessage('Property is required').isMongoId().withMessage('Invalid property ID'),
  body('leaseStart').notEmpty().withMessage('Lease start date is required').isISO8601().withMessage('Invalid date format'),
  body('leaseEnd').notEmpty().withMessage('Lease end date is required').isISO8601().withMessage('Invalid date format'),
  body('monthlyRent').notEmpty().withMessage('Monthly rent is required').isNumeric().withMessage('Rent must be a number'),
  body('email').optional().isEmail().withMessage('Invalid email format'),
  handleValidationErrors,
];

/**
 * Expense validation
 */
const validateExpense = [
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('amount')
    .notEmpty()
    .withMessage('Amount is required')
    .isNumeric()
    .withMessage('Amount must be a number')
    .custom((value) => {
      if (parseFloat(value) < 0) {
        throw new Error('Amount cannot be negative');
      }
      return true;
    }),
  body('property').notEmpty().withMessage('Property is required').isMongoId().withMessage('Invalid property ID'),
  body('date').optional().isISO8601().withMessage('Invalid date format'),
  handleValidationErrors,
];

module.exports = {
  handleValidationErrors,
  validateSignup,
  validateLogin,
  validatePasswordChange,
  validateProperty,
  validateTransaction,
  validateTenant,
  validateExpense,
};
