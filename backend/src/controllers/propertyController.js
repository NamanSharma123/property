const db = require('../config/db');

/**
 * Map frontend property types to database property types
 */
const mapPropertyType = (frontendType) => {
  if (!frontendType) return 'residential';

  // Normalize input
  const normalized = frontendType.toString().trim();

  const typeMap = {
    // Original label versions
    'Residential - Investment': 'residential',
    'Residential - Owner Occupied': 'residential',
    'Commercial - Investment': 'commercial',
    'Commercial - Owner Occupied': 'commercial',
    'Industrial': 'industrial',
    'Mixed-Use': 'mixed-use',
    'Land': 'land',
    // Lowercase label versions (frontend lowercases before sending)
    'residential - investment': 'residential',
    'residential - owner occupied': 'residential',
    'commercial - investment': 'commercial',
    'commercial - owner occupied': 'commercial',
    'industrial': 'industrial',
    'mixed-use': 'mixed-use',
    'land': 'land',
    // Kebab-case values from the value field
    'residential-investment': 'residential',
    'residential-owner': 'residential',
    'commercial-investment': 'commercial',
    'commercial-owner': 'commercial',
    // Base types (already valid)
    'residential': 'residential',
    'commercial': 'commercial',
  };

  // Check exact match first
  if (typeMap[normalized]) {
    return typeMap[normalized];
  }

  // Try to extract the base type from "Type - Subtype" format or "Type-Subtype" format
  const baseType = normalized.split(/[\s-]/)[0].toLowerCase();
  const validTypes = ['residential', 'commercial', 'industrial', 'mixed-use', 'land'];

  if (validTypes.includes(baseType)) {
    return baseType;
  }

  return 'residential';
};

/**
 * Build the denormalized full_address string from an address object.
 * Strips stray trailing commas/whitespace from each part so dirty input
 * (e.g. a street already saved as "41 Swanson St,") never produces "St,,".
 */
const buildFullAddress = (address) => {
  if (!address || typeof address !== 'object') return '';
  const street = (address.street || '').toString().trim().replace(/,+$/, '').trim();
  const city = (address.city || '').toString().trim().replace(/,+$/, '').trim();
  const tail = `${address.state || ''} ${address.zipCode || ''}`.trim();
  return [street, city, tail].filter(Boolean).join(', ');
};

/**
 * Log activity
 */
const logActivity = async (data) => {
  try {
    await db.query(
      `INSERT INTO activity_logs (user_id, action, description, resource_type, resource_id, ip_address, user_agent, success)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [data.user, data.action, data.description || null, data.resourceType || null,
      data.resourceId || null, data.ipAddress || null, data.userAgent || null, data.success !== false]
    );
  } catch (error) {
    console.error('Error logging activity:', error);
  }
};

/**
 * Get all properties for the authenticated user
 */
exports.getProperties = async (req, res, next) => {
  try {
    const { status, type, search, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM properties WHERE owner_id = $1';
    let countQuery = 'SELECT COUNT(*) FROM properties WHERE owner_id = $1';
    const params = [req.user.id];
    let paramIndex = 2;

    if (status) {
      query += ` AND status = $${paramIndex}`;
      countQuery += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (type) {
      query += ` AND type = $${paramIndex}`;
      countQuery += ` AND type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    if (search) {
      query += ` AND (name ILIKE $${paramIndex} OR full_address ILIKE $${paramIndex})`;
      countQuery += ` AND (name ILIKE $${paramIndex} OR full_address ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), offset);

    const [propertiesResult, countResult] = await Promise.all([
      db.query(query, params),
      db.query(countQuery, params.slice(0, -2)),
    ]);

    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: {
        properties: propertiesResult.rows,
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
 * Get single property by ID
 */
exports.getProperty = async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT * FROM properties WHERE id = $1 AND owner_id = $2',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Property not found',
      });
    }

    // Get tenants for this property
    const tenantsResult = await db.query(
      'SELECT * FROM tenants WHERE property_id = $1',
      [req.params.id]
    );

    const property = result.rows[0];
    property.tenants = tenantsResult.rows;

    res.json({
      success: true,
      data: { property },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new property
 */
exports.createProperty = async (req, res, next) => {
  try {
    const {
      name, address, type, subType, units, occupancy,
      purchasePrice, purchaseDate, currentValue, monthlyRent,
      yearBuilt, squareFeet, lotSize, bedrooms, bathrooms,
      amenities, description, images, status, taxId, notes,
      loanDetails, ownershipDetails, ownership, hasDepreciation, usage
    } = req.body;

    // Generate full address
    const fullAddress = buildFullAddress(address);

    const result = await db.query(
      `INSERT INTO properties (
        owner_id, name, address, full_address, type, sub_type, units, occupancy,
        purchase_price, purchase_date, current_value, monthly_rent,
        year_built, square_feet, lot_size, bedrooms, bathrooms,
        amenities, description, images, status, tax_id, notes,
        loan_details, ownership_details, ownership, has_depreciation, usage
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)
      RETURNING *`,
      [
        req.user.id, name, JSON.stringify(address || {}), fullAddress,
        mapPropertyType(type), subType || null, units || 1, occupancy || 0,
        purchasePrice || null, purchaseDate || null, currentValue || null, monthlyRent || null,
        yearBuilt || null, squareFeet || null, lotSize || null, bedrooms || null, bathrooms || null,
        amenities || [], description || null, JSON.stringify(images || []),
        status || 'active', taxId || null, notes || null,
        loanDetails ? JSON.stringify(loanDetails) : '{}',
        ownershipDetails ? JSON.stringify(ownershipDetails) : '{}',
        ownership || null,
        hasDepreciation === true || hasDepreciation === 'yes' || hasDepreciation === 'true',
        usage || null
      ]
    );

    const property = result.rows[0];

    await logActivity({
      user: req.user.id,
      action: 'property_create',
      resourceType: 'property',
      resourceId: property.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      success: true,
    });

    res.status(201).json({
      success: true,
      data: { property },
      message: 'Property created successfully',
    });
  } catch (error) {
    next(error);
  }
};


/**
 * Update property
 */
exports.updateProperty = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    console.log('=== UPDATE PROPERTY REQUEST ===');
    console.log('Property ID:', id);
    console.log('User ID:', req.user?.id);
    console.log('Updates keys:', Object.keys(updates));
    console.log('Updates:', JSON.stringify(updates, null, 2));

    // Check if property exists and belongs to user
    const checkResult = await db.query(
      'SELECT id FROM properties WHERE id = $1 AND owner_id = $2',
      [id, req.user.id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Property not found',
      });
    }

    // Build update query dynamically
    const allowedFields = [
      'name', 'address', 'type', 'sub_type', 'units', 'occupancy',
      'purchase_price', 'purchase_date', 'current_value', 'monthly_rent',
      'year_built', 'square_feet', 'lot_size', 'bedrooms', 'bathrooms',
      'amenities', 'description', 'images', 'status', 'tax_id', 'notes',
      'loan_details', 'ownership_details', 'ownership', 'has_depreciation', 'usage'
    ];

    const setClauses = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allowedFields.includes(snakeKey)) {
        setClauses.push(`${snakeKey} = $${paramIndex}`);

        let finalValue = value;

        // Handle special fields
        if (snakeKey === 'type') {
          finalValue = mapPropertyType(value);
        } else if (snakeKey === 'has_depreciation') {
          finalValue = value === true || value === 'yes' || value === 'true';
        } else if (snakeKey === 'loan_details' || snakeKey === 'ownership_details') {
          // Ensure these fields are never null - always valid JSON
          if (value === null || value === undefined || value === '') {
            finalValue = '{}';
          } else if (typeof value === 'object' && value !== null) {
            finalValue = JSON.stringify(value);
          } else if (typeof value === 'string') {
            // Already a string, keep it
            finalValue = value;
          } else {
            finalValue = '{}';
          }
        } else if (typeof value === 'object' && value !== null) {
          finalValue = JSON.stringify(value);
        }

        values.push(finalValue);
        paramIndex++;
      }
    }

    // Update full_address if address changed
    if (updates.address) {
      const fullAddress = buildFullAddress(updates.address);
      setClauses.push(`full_address = $${paramIndex}`);
      values.push(fullAddress);
      paramIndex++;
    }

    if (setClauses.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update',
      });
    }

    values.push(id, req.user.id);

    const result = await db.query(
      `UPDATE properties SET ${setClauses.join(', ')} 
       WHERE id = $${paramIndex} AND owner_id = $${paramIndex + 1}
       RETURNING *`,
      values
    );

    await logActivity({
      user: req.user.id,
      action: 'property_update',
      resourceType: 'property',
      resourceId: id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      success: true,
    });

    res.json({
      success: true,
      data: { property: result.rows[0] },
      message: 'Property updated successfully',
    });
  } catch (error) {
    console.error('=== UPDATE PROPERTY ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Full error:', error);
    next(error);
  }
};

/**
 * Delete property
 */
exports.deleteProperty = async (req, res, next) => {
  try {
    const result = await db.query(
      'DELETE FROM properties WHERE id = $1 AND owner_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Property not found',
      });
    }

    await logActivity({
      user: req.user.id,
      action: 'property_delete',
      resourceType: 'property',
      resourceId: req.params.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      success: true,
    });

    res.json({
      success: true,
      message: 'Property deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get property stats/summary
 */
exports.getPropertyStats = async (req, res, next) => {
  try {
    const statsResult = await db.query(
      `SELECT 
        COUNT(*) as total_properties,
        COALESCE(SUM(units), 0) as total_units,
        COALESCE(SUM(occupancy), 0) as total_occupied,
        COALESCE(SUM(current_value), 0) as total_value,
        COALESCE(SUM(monthly_rent), 0) as total_monthly_rent
       FROM properties 
       WHERE owner_id = $1`,
      [req.user.id]
    );

    const statusResult = await db.query(
      `SELECT status, COUNT(*) as count
       FROM properties 
       WHERE owner_id = $1
       GROUP BY status`,
      [req.user.id]
    );

    const stats = statsResult.rows[0];
    const statusCounts = statusResult.rows.reduce((acc, curr) => {
      acc[curr.status] = parseInt(curr.count);
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        stats: {
          totalProperties: parseInt(stats.total_properties),
          totalUnits: parseInt(stats.total_units),
          totalOccupied: parseInt(stats.total_occupied),
          totalValue: parseFloat(stats.total_value),
          totalMonthlyRent: parseFloat(stats.total_monthly_rent),
        },
        statusCounts,
      },
    });
  } catch (error) {
    next(error);
  }
};
