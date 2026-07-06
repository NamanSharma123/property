const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const argon2 = require('argon2');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const config = require('../config');
const { notifyWelcome } = require('./notificationController');

/**
 * Generate Access Token (short-lived)
 */
const generateAccessToken = (userId) => {
  return jwt.sign({ userId }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
};

/**
 * Generate Refresh Token (long-lived)
 */
const generateRefreshToken = () => {
  return crypto.randomBytes(64).toString('hex');
};

/**
 * Generate unique ID for user
 */
const generateUniqueId = (role) => {
  const prefix = role.toUpperCase().substring(0, 3);
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

/**
 * Log activity
 */
const logActivity = async (data) => {
  try {
    await db.query(
      `INSERT INTO activity_logs (user_id, action, description, resource_type, resource_id, ip_address, user_agent, success, error_message, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        data.user,
        data.action,
        data.description || null,
        data.resourceType || null,
        data.resourceId || null,
        data.ipAddress || null,
        data.userAgent || null,
        data.success !== false,
        data.errorMessage || null,
        data.metadata ? JSON.stringify(data.metadata) : null,
      ]
    );
  } catch (error) {
    console.error('Error logging activity:', error);
  }
};

/**
 * Format user for response (remove sensitive fields)
 */
const formatUser = (user) => {
  const { password_hash, ...safeUser } = user;
  return {
    id: safeUser.id,
    name: safeUser.name,
    email: safeUser.email,
    role: safeUser.role,
    uniqueId: safeUser.unique_id,
    phone: safeUser.phone,
    avatar: safeUser.avatar,
    isEmailVerified: safeUser.is_email_verified,
    accountStatus: safeUser.account_status,
    lastLogin: safeUser.last_login,
    createdAt: safeUser.created_at,
    updatedAt: safeUser.updated_at,
  };
};

/**
 * Signup - Register new user
 */
exports.signup = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Email already registered',
      });
    }

    // Hash password with Argon2
    const passwordHash = await argon2.hash(password);

    // Generate unique ID
    const uniqueId = generateUniqueId(role || 'staff');

    // Create user
    const result = await db.query(
      `INSERT INTO users (name, email, password_hash, role, unique_id, account_status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, email.toLowerCase(), passwordHash, role || 'staff', uniqueId, 'active']
    );

    const user = result.rows[0];

    // Generate tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken();

    // Calculate refresh token expiry (30 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + config.session.refreshDays);

    // Save session to database
    await db.query(
      `INSERT INTO sessions (user_id, refresh_token, device_info, ip_address, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        user.id,
        refreshToken,
        JSON.stringify({ userAgent: req.headers['user-agent'] }),
        req.ip,
        expiresAt,
      ]
    );

    // Log activity
    await logActivity({
      user: user.id,
      action: 'signup',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      success: true,
    });

    // Send welcome notification
    await notifyWelcome(user.id, name);

    res.status(201).json({
      success: true,
      data: {
        user: formatUser(user),
        accessToken,
        refreshToken,
      },
      message: 'Account created successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login - Authenticate user
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user with password
    const result = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    // Check if account is locked
    if (user.lock_until && new Date(user.lock_until) > new Date()) {
      await logActivity({
        user: user.id,
        action: 'login_failed',
        description: 'Account is locked',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        success: false,
        errorMessage: 'Account locked',
      });

      return res.status(423).json({
        success: false,
        error: 'Account is temporarily locked. Please try again later.',
      });
    }

    // Check if account is active
    if (user.account_status !== 'active') {
      return res.status(403).json({
        success: false,
        error: `Account is ${user.account_status}. Please contact support.`,
      });
    }

    // Verify password with Argon2
    let isMatch = false;
    try {
      isMatch = await argon2.verify(user.password_hash, password);
    } catch (error) {
      console.error('Password verification error:', error);
    }

    if (!isMatch) {
      // Increment login attempts
      const newAttempts = (user.login_attempts || 0) + 1;
      let lockUntil = null;

      // Lock account after 5 failed attempts for 15 minutes
      if (newAttempts >= 5) {
        lockUntil = new Date(Date.now() + 15 * 60 * 1000);
      }

      await db.query(
        'UPDATE users SET login_attempts = $1, lock_until = $2 WHERE id = $3',
        [newAttempts, lockUntil, user.id]
      );

      await logActivity({
        user: user.id,
        action: 'login_failed',
        description: 'Invalid password',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        success: false,
        errorMessage: 'Invalid password',
      });

      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    // Reset login attempts on successful login
    await db.query(
      'UPDATE users SET login_attempts = 0, lock_until = NULL, last_login = NOW() WHERE id = $1',
      [user.id]
    );

    // Generate tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken();

    // Calculate refresh token expiry (30 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + config.session.refreshDays);

    // Save session
    await db.query(
      `INSERT INTO sessions (user_id, refresh_token, device_info, ip_address, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        user.id,
        refreshToken,
        JSON.stringify({ userAgent: req.headers['user-agent'] }),
        req.ip,
        expiresAt,
      ]
    );

    // Log activity
    await logActivity({
      user: user.id,
      action: 'login',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      success: true,
    });

    res.json({
      success: true,
      data: {
        user: formatUser(user),
        accessToken,
        refreshToken,
      },
      message: 'Logged in successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Logout - Invalidate session
 */
exports.logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      // Invalidate the session
      await db.query(
        'UPDATE sessions SET is_active = false WHERE refresh_token = $1',
        [refreshToken]
      );
    }

    // Log activity
    if (req.user) {
      await logActivity({
        user: req.user.id,
        action: 'logout',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        success: true,
      });
    }

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh Token - Get new access token
 */
exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: 'No refresh token provided',
      });
    }

    // Find valid session
    const sessionResult = await db.query(
      `SELECT * FROM sessions 
       WHERE refresh_token = $1 
       AND is_active = true 
       AND expires_at > NOW()`,
      [refreshToken]
    );

    const session = sessionResult.rows[0];

    if (!session) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired refresh token',
      });
    }

    // Get user
    const userResult = await db.query(
      'SELECT * FROM users WHERE id = $1',
      [session.user_id]
    );

    const user = userResult.rows[0];

    if (!user || user.account_status !== 'active') {
      await db.query(
        'UPDATE sessions SET is_active = false WHERE id = $1',
        [session.id]
      );
      return res.status(401).json({
        success: false,
        error: 'User not found or inactive',
      });
    }

    // Generate new access token
    const accessToken = generateAccessToken(user.id);

    // Update session last activity
    await db.query(
      'UPDATE sessions SET last_activity = NOW() WHERE id = $1',
      [session.id]
    );

    res.json({
      success: true,
      data: {
        accessToken,
        user: formatUser(user),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Current User - Return authenticated user's profile
 */
exports.getMe = async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT * FROM users WHERE id = $1',
      [req.user.id]
    );

    const user = result.rows[0];

    res.json({
      success: true,
      data: {
        user: formatUser(user),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update Profile
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, phone, avatar } = req.body;

    const result = await db.query(
      `UPDATE users 
       SET name = COALESCE($1, name), 
           phone = COALESCE($2, phone), 
           avatar = COALESCE($3, avatar)
       WHERE id = $4
       RETURNING *`,
      [name, phone, avatar, req.user.id]
    );

    const user = result.rows[0];

    await logActivity({
      user: req.user.id,
      action: 'profile_update',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      success: true,
    });

    res.json({
      success: true,
      data: {
        user: formatUser(user),
      },
      message: 'Profile updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Change Password
 */
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const result = await db.query(
      'SELECT * FROM users WHERE id = $1',
      [req.user.id]
    );

    const user = result.rows[0];

    // Verify current password
    const isMatch = await argon2.verify(user.password_hash, currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        error: 'Current password is incorrect',
      });
    }

    // Hash new password
    const newPasswordHash = await argon2.hash(newPassword);

    // Update password
    await db.query(
      'UPDATE users SET password_hash = $1, password_changed_at = NOW() WHERE id = $2',
      [newPasswordHash, user.id]
    );

    // Invalidate all sessions except current (get refresh token from request body)
    const { currentRefreshToken } = req.body;
    if (currentRefreshToken) {
      await db.query(
        `UPDATE sessions 
         SET is_active = false 
         WHERE user_id = $1 AND refresh_token != $2`,
        [user.id, currentRefreshToken]
      );
    }

    await logActivity({
      user: req.user.id,
      action: 'password_change',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      success: true,
    });

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Active Sessions
 */
exports.getSessions = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT id, device_info, ip_address, last_activity, created_at
       FROM sessions
       WHERE user_id = $1 AND is_active = true AND expires_at > NOW()
       ORDER BY last_activity DESC`,
      [req.user.id]
    );

    res.json({
      success: true,
      data: {
        sessions: result.rows.map((s) => ({
          id: s.id,
          deviceInfo: s.device_info,
          ipAddress: s.ip_address,
          lastActivity: s.last_activity,
          createdAt: s.created_at,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Revoke Session
 */
exports.revokeSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    const result = await db.query(
      `UPDATE sessions 
       SET is_active = false 
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [sessionId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
      });
    }

    res.json({
      success: true,
      message: 'Session revoked successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Revoke All Sessions (except current)
 */
exports.revokeAllSessions = async (req, res, next) => {
  try {
    const { currentRefreshToken } = req.body;

    await db.query(
      `UPDATE sessions 
       SET is_active = false 
       WHERE user_id = $1 AND refresh_token != $2`,
      [req.user.id, currentRefreshToken || '']
    );

    res.json({
      success: true,
      message: 'All other sessions revoked successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete Account - Permanently delete user account and all data
 */
exports.deleteAccount = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { password } = req.body;

    // Verify password before deletion
    if (!password) {
      return res.status(400).json({
        success: false,
        error: 'Password is required to delete account',
      });
    }

    // Get user to verify password
    const userResult = await db.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Verify password
    const isValidPassword = await argon2.verify(userResult.rows[0].password_hash, password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Incorrect password',
      });
    }

    // Log activity before deletion
    await logActivity({
      userId,
      action: 'account_deleted',
      description: 'User permanently deleted their account',
      resourceType: 'user',
      resourceId: userId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      success: true,
    });

    // Delete user (cascades will handle related data)
    await db.query('DELETE FROM users WHERE id = $1', [userId]);

    res.json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify Password - Verify current user's password for sensitive operations
 */
exports.verifyPassword = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        error: 'Password is required',
      });
    }

    // Get user's password hash
    const userResult = await db.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Verify password
    const isValid = await argon2.verify(userResult.rows[0].password_hash, password);

    if (!isValid) {
      await logActivity({
        user: userId,
        action: 'password_verification_failed',
        description: 'Failed password verification for sensitive operation',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        success: false,
      });

      return res.status(401).json({
        success: false,
        error: 'Invalid password',
      });
    }

    await logActivity({
      user: userId,
      action: 'password_verified',
      description: 'Password verified for sensitive operation',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      success: true,
    });

    res.json({
      success: true,
      message: 'Password verified successfully',
    });
  } catch (error) {
    next(error);
  }
};

