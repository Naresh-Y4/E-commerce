// controllers/productController.js
const db = require('../config/db');

// GET /api/products  (supports ?category=slug & ?search=term)
async function getAllProducts(req, res) {
  const { category, search } = req.query;

  let sql = `
    SELECT p.*, c.name AS category_name, c.slug AS category_slug
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE 1=1
  `;
  const params = [];

  if (category) {
    sql += ' AND c.slug = ?';
    params.push(category);
  }
  if (search) {
    sql += ' AND (p.name LIKE ? OR p.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  sql += ' ORDER BY p.created_at DESC';

  try {
    const [products] = await db.query(sql, params);
    res.json({ products });
  } catch (err) {
    console.error('Get products error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

// GET /api/products/categories
async function getCategories(req, res) {
  try {
    const [categories] = await db.query('SELECT * FROM categories ORDER BY name');
    res.json({ categories });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

// GET /api/products/:id
async function getProductById(req, res) {
  try {
    const [rows] = await db.query(
      `SELECT p.*, c.name AS category_name, c.slug AS category_slug
       FROM products p LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ product: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

// POST /api/products  (admin only)
async function createProduct(req, res) {
  const { category_id, name, description, price, image, stock } = req.body;

  if (!name || price === undefined) {
    return res.status(400).json({ error: 'Name and price are required' });
  }

  try {
    const [result] = await db.query(
      'INSERT INTO products (category_id, name, description, price, image, stock) VALUES (?, ?, ?, ?, ?, ?)',
      [category_id || null, name, description || '', price, image || '/images/placeholder.jpg', stock || 0]
    );
    const [rows] = await db.query('SELECT * FROM products WHERE id = ?', [result.insertId]);
    res.status(201).json({ message: 'Product created!', product: rows[0] });
  } catch (err) {
    console.error('Create product error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

// PUT /api/products/:id  (admin only)
async function updateProduct(req, res) {
  const { category_id, name, description, price, image, stock } = req.body;
  const updates = {};
  if (category_id !== undefined) updates.category_id = category_id;
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (price !== undefined) updates.price = price;
  if (image !== undefined) updates.image = image;
  if (stock !== undefined) updates.stock = stock;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'Nothing to update' });
  }

  try {
    const [result] = await db.query('UPDATE products SET ? WHERE id = ?', [updates, req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Product not found' });

    const [rows] = await db.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    res.json({ message: 'Product updated!', product: rows[0] });
  } catch (err) {
    console.error('Update product error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

// DELETE /api/products/:id  (admin only)
async function deleteProduct(req, res) {
  try {
    const [result] = await db.query('DELETE FROM products WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = {
  getAllProducts,
  getCategories,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};