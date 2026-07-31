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
 * Get all transactions for the authenticated user
 */
exports.getTransactions = async (req, res, next) => {
  try {
    const { type, status, propertyId, startDate, endDate, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT t.*, p.name as property_name, p.type as property_type, p.sub_type as property_sub_type, tn.name as tenant_name, c.name as category_display_name
      FROM transactions t
      LEFT JOIN properties p ON t.property_id = p.id
      LEFT JOIN tenants tn ON t.tenant_id = tn.id
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.owner_id = $1
    `;
    let countQuery = 'SELECT COUNT(*) FROM transactions WHERE owner_id = $1';
    const params = [req.user.id];
    let paramIndex = 2;

    if (type) {
      query += ` AND t.type = $${paramIndex}`;
      countQuery += ` AND type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    if (status) {
      query += ` AND t.status = $${paramIndex}`;
      countQuery += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (propertyId) {
      query += ` AND t.property_id = $${paramIndex}`;
      countQuery += ` AND property_id = $${paramIndex}`;
      params.push(propertyId);
      paramIndex++;
    }

    if (startDate) {
      query += ` AND t.date >= $${paramIndex}`;
      countQuery += ` AND date >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND t.date <= $${paramIndex}`;
      countQuery += ` AND date <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    query += ` ORDER BY t.date DESC, t.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), offset);

    const [transactionsResult, countResult] = await Promise.all([
      db.query(query, params),
      db.query(countQuery, params.slice(0, -2)),
    ]);

    const total = parseInt(countResult.rows[0].count);

    // Add signed amount virtual field
    const transactions = transactionsResult.rows.map(t => ({
      ...t,
      signedAmount: t.type === 'expense' ? -Math.abs(parseFloat(t.amount)) : Math.abs(parseFloat(t.amount)),
    }));

    res.json({
      success: true,
      data: {
        transactions,
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
 * Get single transaction by ID
 */
exports.getTransaction = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT t.*, p.name as property_name, p.type as property_type, p.sub_type as property_sub_type, tn.name as tenant_name, c.name as category_display_name
       FROM transactions t
       LEFT JOIN properties p ON t.property_id = p.id
       LEFT JOIN tenants tn ON t.tenant_id = tn.id
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.id = $1 AND t.owner_id = $2`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found',
      });
    }

    res.json({
      success: true,
      data: { transaction: result.rows[0] },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new transaction
 */
exports.createTransaction = async (req, res, next) => {
  try {
    const {
      description, amount, date, type, categoryId, categoryName, unitLabel,
      propertyId, tenantId, status, paymentMethod, referenceNumber,
      receiptUrl, attachments, isRecurring, recurringFrequency,
      recurringEndDate, notes, isTaxDeductible, taxCategory, transactionSource
    } = req.body;

    // Verify property belongs to user and get purchase date
    const propertyCheck = await db.query(
      'SELECT id, purchase_date FROM properties WHERE id = $1 AND owner_id = $2',
      [propertyId, req.user.id]
    );

    if (propertyCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Property not found or does not belong to you',
      });
    }

    const property = propertyCheck.rows[0];

    // date validation: Transaction date cannot be before purchase date (if purchase date exists)
    if (property.purchase_date && date) {
      const transDate = new Date(date);
      const purchDate = new Date(property.purchase_date);
      if (transDate < purchDate) {
        // We'll allow it but maybe we should flag it? For now, let's just allow but we could return a warning
        // strict mode:
        // return res.status(400).json({ success: false, error: 'Transaction date cannot be before property purchase date' });
      }
    }

    // Duplicate Check: Same property, amount, date, validity, and details
    // We compare description/category to avoid flagging distinct transactions (e.g. 2 different repairs) as duplicates.
    // We treat 'undefined' description as empty string for comparison if DB stores it that way, 
    // or we should matching against what we are about to insert.
    const dupDescription = description || '';
    const dupCategory = categoryName || '';
    // Different units can legitimately have identical-looking transactions
    // (e.g. the same rent amount on the same day for Unit A and Unit B).
    const dupUnit = unitLabel || '';

    const duplicateCheck = await db.query(
      `SELECT id FROM transactions
       WHERE property_id = $1
       AND amount = $2
       AND date::date = $3::date
       AND COALESCE(description, '') = $4
       AND COALESCE(category_name, '') = $5
       AND type = $6
       AND owner_id = $7
       AND COALESCE(unit_label, '') = $8
       LIMIT 1`,
      [propertyId, amount, date || new Date(), dupDescription, dupCategory, type, req.user.id, dupUnit]
    );

    if (duplicateCheck.rows.length > 0) {
      // If exact duplicate usage is found
      return res.status(409).json({
        success: false,
        error: 'A duplicate transaction with the same details already exists.',
        duplicateId: duplicateCheck.rows[0].id
      });
    }

    const result = await db.query(
      `INSERT INTO transactions (
        owner_id, property_id, tenant_id, category_id, description, amount, date, type,
        category_name, unit_label, transaction_source, status, payment_method, reference_number, receipt_url, attachments,
        is_recurring, recurring_frequency, recurring_end_date, notes, is_tax_deductible,
        tax_category, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
      RETURNING *`,
      [
        req.user.id, propertyId, tenantId || null, categoryId || null,
        description, amount, date || new Date(), type,
        categoryName || null, unitLabel || null, transactionSource || 'Manual Entry', status || 'pending', paymentMethod || null,
        referenceNumber || null, receiptUrl || null, JSON.stringify(attachments || []),
        isRecurring || false, recurringFrequency || null, recurringEndDate || null,
        notes || null, isTaxDeductible || false, taxCategory || null, req.user.id
      ]
    );

    const transaction = result.rows[0];

    await logActivity({
      user: req.user.id,
      action: 'transaction_create',
      resourceType: 'transaction',
      resourceId: transaction.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      success: true,
    });

    res.status(201).json({
      success: true,
      data: { transaction },
      message: 'Transaction created successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update transaction
 */
exports.updateTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Check if transaction exists and belongs to user
    const checkResult = await db.query(
      'SELECT id FROM transactions WHERE id = $1 AND owner_id = $2',
      [id, req.user.id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found',
      });
    }

    const allowedFields = [
      'description', 'amount', 'date', 'type', 'category_id', 'category_name',
      'unit_label', 'property_id', 'tenant_id', 'status', 'payment_method', 'reference_number',
      'receipt_url', 'attachments', 'is_recurring', 'recurring_frequency',
      'recurring_end_date', 'notes', 'is_tax_deductible', 'tax_category'
    ];

    const setClauses = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allowedFields.includes(snakeKey)) {
        setClauses.push(`${snakeKey} = $${paramIndex}`);
        values.push(typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date)
          ? JSON.stringify(value)
          : Array.isArray(value) ? JSON.stringify(value) : value);
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
      `UPDATE transactions SET ${setClauses.join(', ')} 
       WHERE id = $${paramIndex} AND owner_id = $${paramIndex + 1}
       RETURNING *`,
      values
    );

    await logActivity({
      user: req.user.id,
      action: 'transaction_update',
      resourceType: 'transaction',
      resourceId: id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      success: true,
    });

    res.json({
      success: true,
      data: { transaction: result.rows[0] },
      message: 'Transaction updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete transaction
 */
exports.deleteTransaction = async (req, res, next) => {
  try {
    const result = await db.query(
      'DELETE FROM transactions WHERE id = $1 AND owner_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found',
      });
    }

    await logActivity({
      user: req.user.id,
      action: 'transaction_delete',
      resourceType: 'transaction',
      resourceId: req.params.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      success: true,
    });

    res.json({
      success: true,
      message: 'Transaction deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get transaction stats/summary
 */
exports.getTransactionStats = async (req, res, next) => {
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

    const statsResult = await db.query(
      `SELECT 
        type,
        status,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total
       FROM transactions 
       ${whereClause}
       GROUP BY type, status`,
      params
    );

    const stats = {
      income: { total: 0, pending: 0, paid: 0, count: 0 },
      expense: { total: 0, pending: 0, paid: 0, count: 0 },
    };

    statsResult.rows.forEach(row => {
      if (stats[row.type]) {
        stats[row.type].count += parseInt(row.count);
        stats[row.type].total += parseFloat(row.total);
        if (row.status === 'pending') {
          stats[row.type].pending += parseFloat(row.total);
        } else if (row.status === 'paid') {
          stats[row.type].paid += parseFloat(row.total);
        }
      }
    });

    res.json({
      success: true,
      data: {
        stats,
        netIncome: stats.income.total - stats.expense.total,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get monthly transaction breakdown
 */
exports.getMonthlyBreakdown = async (req, res, next) => {
  try {
    const { propertyId, year } = req.query;
    const targetYear = year || new Date().getFullYear();

    let whereClause = 'WHERE owner_id = $1 AND EXTRACT(YEAR FROM date) = $2';
    const params = [req.user.id, targetYear];
    let paramIndex = 3;

    if (propertyId) {
      whereClause += ` AND property_id = $${paramIndex}`;
      params.push(propertyId);
    }

    const result = await db.query(
      `SELECT 
        EXTRACT(MONTH FROM date) as month,
        type,
        COALESCE(SUM(amount), 0) as total,
        COUNT(*) as count
       FROM transactions 
       ${whereClause}
       GROUP BY EXTRACT(MONTH FROM date), type
       ORDER BY month`,
      params
    );

    // Initialize all months
    const monthlyData = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      income: 0,
      expense: 0,
      net: 0,
    }));

    // Fill in actual data
    result.rows.forEach(row => {
      const monthIndex = parseInt(row.month) - 1;
      if (row.type === 'income') {
        monthlyData[monthIndex].income = parseFloat(row.total);
      } else {
        monthlyData[monthIndex].expense = parseFloat(row.total);
      }
    });

    // Calculate net for each month
    monthlyData.forEach(month => {
      month.net = month.income - month.expense;
    });

    res.json({
      success: true,
      data: {
        year: parseInt(targetYear),
        monthly: monthlyData,
      },
    });
  } catch (error) {
    next(error);
  }
};
