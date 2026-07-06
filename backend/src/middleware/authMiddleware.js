const jwt = require('jsonwebtoken');
const db = require('../config/db');
const config = require('../config');

/**
 * Protect routes - Verify JWT token
 */
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Get token from Authorization header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized - No token provided',
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, config.jwt.secret);

      // Get user from database
      const result = await db.query(
        'SELECT * FROM users WHERE id = $1',
        [decoded.userId]
      );

      const user = result.rows[0];

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'User not found',
        });
      }

      // Check if user is active
      if (user.account_status !== 'active') {
        return res.status(403).json({
          success: false,
          error: `Account is ${user.account_status}`,
        });
      }

      // Check if password was changed after token was issued
      if (user.password_changed_at) {
        const changedTimestamp = Math.floor(new Date(user.password_changed_at).getTime() / 1000);
        if (decoded.iat < changedTimestamp) {
          return res.status(401).json({
            success: false,
            error: 'Password recently changed. Please log in again.',
          });
        }
      }

      // Attach user to request (convert snake_case to camelCase for compatibility)
      req.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        uniqueId: user.unique_id,
        phone: user.phone,
        avatar: user.avatar,
        isEmailVerified: user.is_email_verified,
        accountStatus: user.account_status,
        lastLogin: user.last_login,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      };

      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: 'Token expired',
          code: 'TOKEN_EXPIRED',
        });
      }
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          error: 'Invalid token',
        });
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Restrict to specific roles
 */
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to perform this action',
      });
    }
    next();
  };
};

/**
 * Optional auth - Attach user if token exists but don't require it
 */
exports.optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, config.jwt.secret);
        const result = await db.query(
          'SELECT * FROM users WHERE id = $1',
          [decoded.userId]
        );

        const user = result.rows[0];

        if (user && user.account_status === 'active') {
          req.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            uniqueId: user.unique_id,
            accountStatus: user.account_status,
          };
        }
      } catch (error) {
        // Token invalid or expired, continue without user
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};
