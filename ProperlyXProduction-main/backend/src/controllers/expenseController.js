const db = require('../config/db');

/**
 * Log activity
 */
const logActivity = async (data) => {
  try {
    await db.query(
      `INSERT INTO activity_logs (user_id, action, resource_type, resource_id, ip_address, user_agent, success)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [data.user, data.action, data.resourceType || null, data.resourceId || null,
      data.ipAddress || null, data.userAgent || null, data.success !== false]
    );
  } catch (error) {
    console.error('Error logging activity:', error);
  }
};

/**
 * Get all expenses for the authenticated user
 */
exports.getExpenses = async (req, res, next) => {
  try {
    const { status, propertyId, categoryId, startDate, endDate, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT e.*, p.name as property_name, c.name as category_display_name
      FROM expenses e
      LEFT JOIN properties p ON e.property_id = p.id
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE e.owner_id = $1
    `;
    let countQuery = 'SELECT COUNT(*) FROM expenses WHERE owner_id = $1';
    const params = [req.user.id];
    let paramIndex = 2;

    if (status) {
      query += ` AND e.status = $${paramIndex}`;
      countQuery += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (propertyId) {
      query += ` AND e.property_id = $${paramIndex}`;
      countQuery += ` AND property_id = $${paramIndex}`;
      params.push(propertyId);
      paramIndex++;
    }

    if (categoryId) {
      query += ` AND e.category_id = $${paramIndex}`;
      countQuery += ` AND category_id = $${paramIndex}`;
      params.push(categoryId);
      paramIndex++;
    }

    if (startDate) {
      query += ` AND e.date >= $${paramIndex}`;
      countQuery += ` AND date >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND e.date <= $${paramIndex}`;
      countQuery += ` AND date <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    query += ` ORDER BY e.date DESC, e.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), offset);

    const [expensesResult, countResult] = await Promise.all([
      db.query(query, params),
      db.query(countQuery, params.slice(0, -2)),
    ]);

    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: {
        expenses: expensesResult.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single expense by ID
 */
exports.getExpense = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT e.*, p.name as property_name, c.name as category_display_name
       FROM expenses e
       LEFT JOIN properties p ON e.property_id = p.id
       LEFT JOIN categories c ON e.category_id = c.id
       WHERE e.id = $1 AND e.owner_id = $2`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Expense not found',
      });
    }

    res.json({
      success: true,
      data: { expense: result.rows[0] },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new expense
 */
exports.createExpense = async (req, res, next) => {
  try {
    const {
      description, amount, date, categoryId, categoryName, propertyId,
      status, vendor, receiptUrl, attachments, paymentMethod,
      referenceNumber, paidDate, isRecurring, recurringFrequency,
      notes, isTaxDeductible, taxCategory
    } = req.body;

    // Verify property belongs to user
    const propertyCheck = await db.query(
      'SELECT id FROM properties WHERE id = $1 AND owner_id = $2',
      [propertyId, req.user.id]
    );

    if (propertyCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Property not found or does not belong to you',
      });
    }

    const result = await db.query(
      `INSERT INTO expenses (
        owner_id, property_id, category_id, description, amount, date,
        category_name, status, vendor, receipt_url, attachments, payment_method,
        reference_number, paid_date, is_recurring, recurring_frequency,
        notes, is_tax_deductible, tax_category, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *`,
      [
        req.user.id, propertyId, categoryId || null, description, amount,
        date || new Date(), categoryName || null, status || 'pending',
        JSON.stringify(vendor || {}), receiptUrl || null, JSON.stringify(attachments || []),
        paymentMethod || null, referenceNumber || null, paidDate || null,
        isRecurring || false, recurringFrequency || null, notes || null,
        isTaxDeductible !== false, taxCategory || null, req.user.id
      ]
    );

    const expense = result.rows[0];

    await logActivity({
      user: req.user.id,
      action: 'expense_create',
      resourceType: 'expense',
      resourceId: expense.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      success: true,
    });

    res.status(201).json({
      success: true,
      data: { expense },
      message: 'Expense created successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update expense
 */
exports.updateExpense = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Check if expense exists and belongs to user
    const checkResult = await db.query(
      'SELECT id FROM expenses WHERE id = $1 AND owner_id = $2',
      [id, req.user.id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Expense not found',
      });
    }

    const allowedFields = [
      'description', 'amount', 'date', 'category_id', 'category_name', 'property_id',
      'status', 'vendor', 'receipt_url', 'attachments', 'payment_method',
      'reference_number', 'paid_date', 'is_recurring', 'recurring_frequency',
      'notes', 'is_tax_deductible', 'tax_category'
    ];

    const setClauses = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allowedFields.includes(snakeKey)) {
        setClauses.push(`${snakeKey} = $${paramIndex}`);
        values.push(typeof value === 'object' && value !== null && !(value instanceof Date)
          ? JSON.stringify(value)
          : value);
        paramIndex++;
      }
    }

    if (setClauses.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update',
      });
    }

    values.push(id, req.user.id);

    const result = await db.query(
      `UPDATE expenses SET ${setClauses.join(', ')} 
       WHERE id = $${paramIndex} AND owner_id = $${paramIndex + 1}
       RETURNING *`,
      values
    );

    await logActivity({
      user: req.user.id,
      action: 'expense_update',
      resourceType: 'expense',
      resourceId: id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      success: true,
    });

    res.json({
      success: true,
      data: { expense: result.rows[0] },
      message: 'Expense updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete expense
 */
exports.deleteExpense = async (req, res, next) => {
  try {
    const result = await db.query(
      'DELETE FROM expenses WHERE id = $1 AND owner_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Expense not found',
      });
    }

    await logActivity({
      user: req.user.id,
      action: 'expense_delete',
      resourceType: 'expense',
      resourceId: req.params.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      success: true,
    });

    res.json({
      success: true,
      message: 'Expense deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get expense stats/summary
 */
exports.getExpenseStats = async (req, res, next) => {
  try {
    const { propertyId, startDate, endDate } = req.query;

    let whereClause = 'WHERE owner_id = $1';
    const params = [req.user.id];
    let paramIndex = 2;

    if (propertyId) {
      whereClause += ` AND property_id = $${paramIndex}`;
      params.push(propertyId);
      paramIndex++;
    }

    if (startDate) {
      whereClause += ` AND date >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      whereClause += ` AND date <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    // Total by status
    const statusResult = await db.query(
      `SELECT status, COUNT(*) as count, COALESCE(SUM(amount), 0) as total
       FROM expenses ${whereClause}
       GROUP BY status`,
      params
    );

    // Total by category
    const categoryResult = await db.query(
      `SELECT COALESCE(category_name, 'Uncategorized') as category, 
              COUNT(*) as count, COALESCE(SUM(amount), 0) as total
       FROM expenses ${whereClause}
       GROUP BY category_name
       ORDER BY total DESC`,
      params
    );

    const stats = {
      byStatus: statusResult.rows.reduce((acc, row) => {
        acc[row.status] = { count: parseInt(row.count), total: parseFloat(row.total) };
        return acc;
      }, {}),
      byCategory: categoryResult.rows.map(row => ({
        category: row.category,
        count: parseInt(row.count),
        total: parseFloat(row.total),
      })),
      total: statusResult.rows.reduce((sum, row) => sum + parseFloat(row.total), 0),
    };

    res.json({
      success: true,
      data: { stats },
    });
  } catch (error) {
    next(error);
  }
};
