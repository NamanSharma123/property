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
 * Get all tenants for the authenticated user
 */
exports.getTenants = async (req, res, next) => {
  try {
    const { status, propertyId, search, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT t.*, p.name as property_name
      FROM tenants t
      LEFT JOIN properties p ON t.property_id = p.id
      WHERE t.owner_id = $1
    `;
    let countQuery = 'SELECT COUNT(*) FROM tenants WHERE owner_id = $1';
    const params = [req.user.id];
    let paramIndex = 2;

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

    if (search) {
      query += ` AND (t.name ILIKE $${paramIndex} OR t.email ILIKE $${paramIndex})`;
      countQuery += ` AND (name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ` ORDER BY t.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), offset);

    const [tenantsResult, countResult] = await Promise.all([
      db.query(query, params),
      db.query(countQuery, params.slice(0, -2)),
    ]);

    const total = parseInt(countResult.rows[0].count);

    // Add computed fields
    const tenants = tenantsResult.rows.map(t => {
      const now = new Date();
      const leaseEnd = new Date(t.lease_end);
      const leaseStart = new Date(t.lease_start);

      let leaseStatus = 'active';
      if (leaseEnd < now) leaseStatus = 'expired';
      else if (leaseStart > now) leaseStatus = 'upcoming';

      const daysUntilLeaseEnd = Math.ceil((leaseEnd - now) / (1000 * 60 * 60 * 24));

      return {
        ...t,
        leaseStatus,
        daysUntilLeaseEnd,
      };
    });

    res.json({
      success: true,
      data: {
        tenants,
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
 * Get single tenant by ID
 */
exports.getTenant = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT t.*, p.name as property_name
       FROM tenants t
       LEFT JOIN properties p ON t.property_id = p.id
       WHERE t.id = $1 AND t.owner_id = $2`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Tenant not found',
      });
    }

    const tenant = result.rows[0];

    // Add computed fields
    const now = new Date();
    const leaseEnd = new Date(tenant.lease_end);
    const leaseStart = new Date(tenant.lease_start);

    tenant.leaseStatus = leaseEnd < now ? 'expired' : leaseStart > now ? 'upcoming' : 'active';
    tenant.daysUntilLeaseEnd = Math.ceil((leaseEnd - now) / (1000 * 60 * 60 * 24));

    // Get payment history
    const paymentsResult = await db.query(
      `SELECT * FROM transactions 
       WHERE tenant_id = $1 AND type = 'income'
       ORDER BY date DESC LIMIT 10`,
      [req.params.id]
    );

    tenant.paymentHistory = paymentsResult.rows;

    res.json({
      success: true,
      data: { tenant },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new tenant
 */
exports.createTenant = async (req, res, next) => {
  try {
    const {
      name, email, phone, propertyId, unit, leaseStart, leaseEnd,
      monthlyRent, securityDeposit, rentDueDay, status,
      emergencyContact, documents, moveInDate, moveOutDate, notes
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
      `INSERT INTO tenants (
        owner_id, property_id, name, email, phone, unit, lease_start, lease_end,
        monthly_rent, security_deposit, rent_due_day, status,
        emergency_contact, documents, move_in_date, move_out_date, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *`,
      [
        req.user.id, propertyId, name, email || null, phone || null,
        unit || '1', leaseStart, leaseEnd, monthlyRent,
        securityDeposit || 0, rentDueDay || 1, status || 'pending',
        JSON.stringify(emergencyContact || {}), JSON.stringify(documents || []),
        moveInDate || null, moveOutDate || null, notes || null
      ]
    );

    const tenant = result.rows[0];

    // Update property occupancy
    await db.query(
      `UPDATE properties 
       SET occupancy = (SELECT COUNT(*) FROM tenants WHERE property_id = $1 AND status = 'active')
       WHERE id = $1`,
      [propertyId]
    );

    await logActivity({
      user: req.user.id,
      action: 'tenant_create',
      resourceType: 'tenant',
      resourceId: tenant.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      success: true,
    });

    res.status(201).json({
      success: true,
      data: { tenant },
      message: 'Tenant created successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update tenant
 */
exports.updateTenant = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Check if tenant exists and belongs to user
    const checkResult = await db.query(
      'SELECT id, property_id FROM tenants WHERE id = $1 AND owner_id = $2',
      [id, req.user.id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Tenant not found',
      });
    }

    const oldPropertyId = checkResult.rows[0].property_id;

    const allowedFields = [
      'name', 'email', 'phone', 'property_id', 'unit', 'lease_start', 'lease_end',
      'monthly_rent', 'security_deposit', 'rent_due_day', 'status',
      'emergency_contact', 'documents', 'move_in_date', 'move_out_date', 'notes'
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
      `UPDATE tenants SET ${setClauses.join(', ')} 
       WHERE id = $${paramIndex} AND owner_id = $${paramIndex + 1}
       RETURNING *`,
      values
    );

    const tenant = result.rows[0];

    // Update property occupancy if status or property changed
    if (updates.status || updates.propertyId) {
      await db.query(
        `UPDATE properties 
         SET occupancy = (SELECT COUNT(*) FROM tenants WHERE property_id = $1 AND status = 'active')
         WHERE id = $1`,
        [oldPropertyId]
      );

      if (updates.propertyId && updates.propertyId !== oldPropertyId) {
        await db.query(
          `UPDATE properties 
           SET occupancy = (SELECT COUNT(*) FROM tenants WHERE property_id = $1 AND status = 'active')
           WHERE id = $1`,
          [updates.propertyId]
        );
      }
    }

    await logActivity({
      user: req.user.id,
      action: 'tenant_update',
      resourceType: 'tenant',
      resourceId: id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      success: true,
    });

    res.json({
      success: true,
      data: { tenant },
      message: 'Tenant updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete tenant
 */
exports.deleteTenant = async (req, res, next) => {
  try {
    const result = await db.query(
      'DELETE FROM tenants WHERE id = $1 AND owner_id = $2 RETURNING id, property_id',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Tenant not found',
      });
    }

    // Update property occupancy
    await db.query(
      `UPDATE properties 
       SET occupancy = (SELECT COUNT(*) FROM tenants WHERE property_id = $1 AND status = 'active')
       WHERE id = $1`,
      [result.rows[0].property_id]
    );

    await logActivity({
      user: req.user.id,
      action: 'tenant_delete',
      resourceType: 'tenant',
      resourceId: req.params.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      success: true,
    });

    res.json({
      success: true,
      message: 'Tenant deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get tenant stats/summary
 */
exports.getTenantStats = async (req, res, next) => {
  try {
    const { propertyId } = req.query;

    let whereClause = 'WHERE owner_id = $1';
    const params = [req.user.id];
    let paramIndex = 2;

    if (propertyId) {
      whereClause += ` AND property_id = $${paramIndex}`;
      params.push(propertyId);
    }

    // Get tenant counts by status
    const statusResult = await db.query(
      `SELECT status, COUNT(*) as count
       FROM tenants ${whereClause}
       GROUP BY status`,
      params
    );

    // Get total rent
    const rentResult = await db.query(
      `SELECT 
        COUNT(*) as total_tenants,
        COALESCE(SUM(monthly_rent), 0) as total_monthly_rent,
        COALESCE(SUM(security_deposit), 0) as total_security_deposits
       FROM tenants ${whereClause}`,
      params
    );

    const statusCounts = statusResult.rows.reduce((acc, row) => {
      acc[row.status] = parseInt(row.count);
      return acc;
    }, {});

    const rentStats = rentResult.rows[0];

    res.json({
      success: true,
      data: {
        stats: {
          totalTenants: parseInt(rentStats.total_tenants),
          totalMonthlyRent: parseFloat(rentStats.total_monthly_rent),
          totalSecurityDeposits: parseFloat(rentStats.total_security_deposits),
          byStatus: statusCounts,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
