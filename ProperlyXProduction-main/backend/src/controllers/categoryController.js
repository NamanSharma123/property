const db = require('../config/db');

/**
 * Get all categories
 */
exports.getCategories = async (req, res, next) => {
  try {
    const { type, includeSystem = 'true' } = req.query;

    let query = `
      SELECT * FROM categories 
      WHERE (owner_id = $1 OR (is_system = true AND $2 = 'true'))
      AND is_active = true
    `;
    const params = [req.user.id, includeSystem];
    let paramIndex = 3;

    if (type) {
      query += ` AND (type = $${paramIndex} OR type = 'both')`;
      params.push(type);
    }

    query += ' ORDER BY is_system DESC, name ASC';

    const result = await db.query(query, params);

    res.json({
      success: true,
      data: {
        categories: result.rows,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single category by ID
 */
exports.getCategory = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT * FROM categories 
       WHERE id = $1 AND (owner_id = $2 OR is_system = true)`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Category not found',
      });
    }

    // Get subcategories if any
    const subcategoriesResult = await db.query(
      'SELECT * FROM categories WHERE parent_id = $1 AND is_active = true',
      [req.params.id]
    );

    const category = result.rows[0];
    category.subcategories = subcategoriesResult.rows;

    res.json({
      success: true,
      data: { category },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new category
 */
exports.createCategory = async (req, res, next) => {
  try {
    const { name, type, description, icon, color, parentId, taxCode, isTaxDeductible } = req.body;

    const result = await db.query(
      `INSERT INTO categories (
        owner_id, name, type, description, icon, color, parent_id, tax_code, is_tax_deductible
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        req.user.id, name, type, description || null, icon || null,
        color || '#6B7280', parentId || null, taxCode || null, isTaxDeductible || false
      ]
    );

    res.status(201).json({
      success: true,
      data: { category: result.rows[0] },
      message: 'Category created successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update category
 */
exports.updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Check if category exists and belongs to user (cannot edit system categories)
    const checkResult = await db.query(
      'SELECT id, is_system FROM categories WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Category not found',
      });
    }

    if (checkResult.rows[0].is_system) {
      return res.status(403).json({
        success: false,
        error: 'Cannot modify system categories',
      });
    }

    // Verify ownership
    const ownerCheck = await db.query(
      'SELECT id FROM categories WHERE id = $1 AND owner_id = $2',
      [id, req.user.id]
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to modify this category',
      });
    }

    const allowedFields = ['name', 'type', 'description', 'icon', 'color', 'parent_id', 'tax_code', 'is_tax_deductible', 'is_active'];

    const setClauses = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allowedFields.includes(snakeKey)) {
        setClauses.push(`${snakeKey} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (setClauses.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update',
      });
    }

    values.push(id);

    const result = await db.query(
      `UPDATE categories SET ${setClauses.join(', ')} 
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    res.json({
      success: true,
      data: { category: result.rows[0] },
      message: 'Category updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete category
 */
exports.deleteCategory = async (req, res, next) => {
  try {
    // Check if category exists and is not a system category
    const checkResult = await db.query(
      'SELECT id, is_system, owner_id FROM categories WHERE id = $1',
      [req.params.id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Category not found',
      });
    }

    if (checkResult.rows[0].is_system) {
      return res.status(403).json({
        success: false,
        error: 'Cannot delete system categories',
      });
    }

    if (checkResult.rows[0].owner_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to delete this category',
      });
    }

    // Soft delete (set is_active to false) instead of hard delete
    await db.query(
      'UPDATE categories SET is_active = false WHERE id = $1',
      [req.params.id]
    );

    res.json({
      success: true,
      message: 'Category deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Seed default categories
 */
exports.seedDefaults = async () => {
  const defaults = [
    // Income categories
    { name: 'Rent', type: 'income', isSystem: true, icon: 'home', color: '#10B981' },
    { name: 'Late Fees', type: 'income', isSystem: true, icon: 'clock', color: '#F59E0B' },
    { name: 'Security Deposit', type: 'income', isSystem: true, icon: 'shield', color: '#3B82F6' },
    { name: 'Other Income', type: 'income', isSystem: true, icon: 'plus', color: '#6B7280' },
    // Expense categories
    { name: 'Maintenance', type: 'expense', isSystem: true, icon: 'wrench', color: '#EF4444', isTaxDeductible: true },
    { name: 'Repairs', type: 'expense', isSystem: true, icon: 'tool', color: '#F97316', isTaxDeductible: true },
    { name: 'Utilities', type: 'expense', isSystem: true, icon: 'zap', color: '#8B5CF6', isTaxDeductible: true },
    { name: 'Insurance', type: 'expense', isSystem: true, icon: 'shield', color: '#06B6D4', isTaxDeductible: true },
    { name: 'Property Tax', type: 'expense', isSystem: true, icon: 'file-text', color: '#EC4899', isTaxDeductible: true },
    { name: 'Mortgage', type: 'expense', isSystem: true, icon: 'home', color: '#14B8A6', isTaxDeductible: true },
    { name: 'HOA Fees', type: 'expense', isSystem: true, icon: 'users', color: '#6366F1', isTaxDeductible: true },
    { name: 'Legal Fees', type: 'expense', isSystem: true, icon: 'briefcase', color: '#A855F7', isTaxDeductible: true },
    { name: 'Advertising', type: 'expense', isSystem: true, icon: 'megaphone', color: '#F43F5E', isTaxDeductible: true },
    { name: 'Management Fees', type: 'expense', isSystem: true, icon: 'user', color: '#22C55E', isTaxDeductible: true },
    { name: 'Supplies', type: 'expense', isSystem: true, icon: 'package', color: '#64748B', isTaxDeductible: true },
    { name: 'Other Expense', type: 'expense', isSystem: true, icon: 'minus', color: '#6B7280', isTaxDeductible: true },
  ];

  for (const cat of defaults) {
    try {
      await db.query(
        `INSERT INTO categories (name, type, is_system, icon, color, is_tax_deductible)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT DO NOTHING`,
        [cat.name, cat.type, cat.isSystem, cat.icon, cat.color, cat.isTaxDeductible || false]
      );
    } catch (error) {
      console.error(`Error seeding category ${cat.name}:`, error.message);
    }
  }

  console.log('Default categories seeded');
};
