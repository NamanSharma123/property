const db = require('../config/db');

/**
 * Get all notifications for the authenticated user
 */
exports.getNotifications = async (req, res, next) => {
    try {
        const { limit = 20, unreadOnly = false } = req.query;

        let query = `
            SELECT * FROM notifications
            WHERE user_id = $1
        `;
        const params = [req.user.id];

        if (unreadOnly === 'true') {
            query += ` AND is_read = FALSE`;
        }

        query += ` ORDER BY created_at DESC LIMIT $2`;
        params.push(parseInt(limit));

        const result = await db.query(query, params);

        // Get unread count
        const countResult = await db.query(
            'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE',
            [req.user.id]
        );

        res.json({
            success: true,
            data: {
                notifications: result.rows,
                unreadCount: parseInt(countResult.rows[0].count),
            },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Mark notification as read
 */
exports.markAsRead = async (req, res, next) => {
    try {
        const { id } = req.params;

        const result = await db.query(
            `UPDATE notifications SET is_read = TRUE
             WHERE id = $1 AND user_id = $2
             RETURNING *`,
            [id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Notification not found',
            });
        }

        res.json({
            success: true,
            data: { notification: result.rows[0] },
            message: 'Notification marked as read',
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Mark all notifications as read
 */
exports.markAllAsRead = async (req, res, next) => {
    try {
        await db.query(
            'UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE',
            [req.user.id]
        );

        res.json({
            success: true,
            message: 'All notifications marked as read',
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete a notification
 */
exports.deleteNotification = async (req, res, next) => {
    try {
        const { id } = req.params;

        const result = await db.query(
            'DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id',
            [id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Notification not found',
            });
        }

        res.json({
            success: true,
            message: 'Notification deleted',
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Create a notification (internal use)
 */
exports.createNotification = async (userId, type, title, message, actionUrl = null, metadata = {}) => {
    try {
        const result = await db.query(
            `INSERT INTO notifications (user_id, type, title, message, action_url, metadata)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [userId, type, title, message, actionUrl, JSON.stringify(metadata)]
        );
        return result.rows[0];
    } catch (error) {
        console.error('Failed to create notification:', error);
        return null;
    }
};

// ============================================
// Helper functions for specific notification types
// ============================================

/**
 * Create a property-related notification
 */
exports.notifyProperty = async (userId, action, propertyName, propertyId = null) => {
    const titles = {
        added: 'Property Added',
        updated: 'Property Updated',
        deleted: 'Property Deleted',
    };
    const messages = {
        added: `"${propertyName}" has been added to your portfolio.`,
        updated: `"${propertyName}" details have been updated.`,
        deleted: `"${propertyName}" has been removed from your portfolio.`,
    };
    const types = {
        added: 'property_added',
        updated: 'property_updated',
        deleted: 'property_deleted',
    };

    return exports.createNotification(
        userId,
        types[action] || 'property',
        titles[action] || 'Property Update',
        messages[action] || `Property "${propertyName}" was ${action}.`,
        propertyId ? `/dashboard/property/${propertyId}` : '/dashboard/property',
        { propertyId, propertyName, action }
    );
};

/**
 * Create a transaction-related notification
 */
exports.notifyTransaction = async (userId, action, amount, category, propertyName = null) => {
    const isIncome = amount > 0;
    const formattedAmount = `$${Math.abs(amount).toLocaleString()}`;

    return exports.createNotification(
        userId,
        isIncome ? 'income' : 'expense',
        `${isIncome ? 'Income' : 'Expense'} ${action === 'added' ? 'Added' : 'Updated'}`,
        `${formattedAmount} ${category}${propertyName ? ` for "${propertyName}"` : ''} has been recorded.`,
        '/dashboard/transactions',
        { amount, category, propertyName, action }
    );
};

/**
 * Create an OCR-related notification
 */
exports.notifyOCR = async (userId, success, transactionCount = 0, fileName = null) => {
    if (success) {
        return exports.createNotification(
            userId,
            'ocr_complete',
            'OCR Processing Complete',
            `Successfully extracted ${transactionCount} transaction(s)${fileName ? ` from "${fileName}"` : ''}.`,
            '/dashboard/transactions',
            { transactionCount, fileName }
        );
    } else {
        return exports.createNotification(
            userId,
            'ocr_failed',
            'OCR Processing Failed',
            `Could not extract data${fileName ? ` from "${fileName}"` : ''}.`,
            '/dashboard/ocr',
            { fileName }
        );
    }
};

/**
 * Create a security-related notification
 */
exports.notifySecurity = async (userId, action, details = {}) => {
    const configs = {
        login: {
            type: 'login',
            title: 'New Login Detected',
            message: `Signed in from ${details.device || 'a device'} at ${details.location || 'unknown location'}.`,
        },
        password_changed: {
            type: 'password_changed',
            title: 'Password Changed',
            message: 'Your password was successfully changed.',
        },
        two_factor_enabled: {
            type: 'security',
            title: 'Two-Factor Authentication Enabled',
            message: 'Your account is now more secure with 2FA.',
        },
    };

    const config = configs[action] || {
        type: 'security',
        title: 'Security Alert',
        message: `Security event: ${action}`,
    };

    return exports.createNotification(
        userId,
        config.type,
        config.title,
        config.message,
        '/dashboard/profile/security',
        { action, ...details }
    );
};

/**
 * Create a system notification
 */
exports.notifySystem = async (userId, type, title, message, actionUrl = null) => {
    return exports.createNotification(
        userId,
        type, // 'info', 'warning', 'error', 'success'
        title,
        message,
        actionUrl,
        { systemNotification: true }
    );
};

/**
 * Create a welcome notification for new users
 */
exports.notifyWelcome = async (userId, userName) => {
    return exports.createNotification(
        userId,
        'welcome',
        'Welcome to Properly! 👋',
        `Hi ${userName}! Get started by adding your first property to track your investments.`,
        '/dashboard/property/new',
        { onboarding: true }
    );
};
