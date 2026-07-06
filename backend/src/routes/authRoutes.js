const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { validateSignup, validateLogin, validatePasswordChange } = require('../middleware/validators');

/**
 * @route   POST /api/auth/signup
 * @desc    Register a new user
 * @access  Public
 */
router.post('/signup', validateSignup, authController.signup);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', validateLogin, authController.login);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', protect, authController.logout);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public (requires refresh token cookie)
 */
router.post('/refresh', authController.refreshToken);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', protect, authController.getMe);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', protect, authController.updateProfile);

/**
 * @route   PUT /api/auth/password
 * @desc    Change password
 * @access  Private
 */
router.put('/password', protect, validatePasswordChange, authController.changePassword);

/**
 * @route   GET /api/auth/sessions
 * @desc    Get user's active sessions
 * @access  Private
 */
router.get('/sessions', protect, authController.getSessions);

/**
 * @route   DELETE /api/auth/sessions/:sessionId
 * @desc    Revoke a specific session
 * @access  Private
 */
router.delete('/sessions/:sessionId', protect, authController.revokeSession);

/**
 * @route   DELETE /api/auth/sessions
 * @desc    Revoke all sessions except current
 * @access  Private
 */
router.delete('/sessions', protect, authController.revokeAllSessions);

/**
 * @route   POST /api/auth/verify-password
 * @desc    Verify user's password for sensitive operations
 * @access  Private
 */
router.post('/verify-password', protect, authController.verifyPassword);

/**
 * @route   DELETE /api/auth/account
 * @desc    Permanently delete user account
 * @access  Private
 */
router.delete('/account', protect, authController.deleteAccount);

module.exports = router;

