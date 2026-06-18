// controllers/orderController.js
const db = require('../config/db');

// ───────────────────────────────
// CART
// ───────────────────────────────

// GET /api/orders/cart
async function getCart(req, res) {
  try {
    const [items] = await db.query(
      `SELECT ci.id AS cart_item_id, ci.quantity, p.id AS product_id, p.name, p.price, p.image, p.stock
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.user_id = ?
       ORDER BY ci.id DESC`,
      [req.user.id]
    );
    const total = items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
    res.json({ items, total: total.toFixed(2) });
  } catch (err) {
    console.error('Get cart error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

// POST /api/orders/cart  { product_id, quantity }
async function addToCart(req, res) {
  const { product_id, quantity = 1 } = req.body;
  if (!product_id) return res.status(400).json({ error: 'product_id is required' });

  try {
    const [productRows] = await db.query('SELECT * FROM products WHERE id = ?', [product_id]);
    if (productRows.length === 0) return res.status(404).json({ error: 'Product not found' });
    if (productRows[0].stock < quantity) {
      return res.status(400).json({ error: 'Not enough stock available' });
    }

    await db.query(
      `INSERT INTO cart_items (user_id, product_id, quantity)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE quantity = quantity + ?`,
      [req.user.id, product_id, quantity, quantity]
    );

    res.status(201).json({ message: 'Added to cart!' });
  } catch (err) {
    console.error('Add to cart error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

// PUT /api/orders/cart/:cartItemId  { quantity }
async function updateCartItem(req, res) {
  const { quantity } = req.body;
  if (!quantity || quantity < 1) return res.status(400).json({ error: 'Quantity must be at least 1' });

  try {
    const [result] = await db.query(
      'UPDATE cart_items SET quantity = ? WHERE id = ? AND user_id = ?',
      [quantity, req.params.cartItemId, req.user.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Cart item not found' });
    res.json({ message: 'Cart updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

// DELETE /api/orders/cart/:cartItemId
async function removeCartItem(req, res) {
  try {
    const [result] = await db.query(
      'DELETE FROM cart_items WHERE id = ? AND user_id = ?',
      [req.params.cartItemId, req.user.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Cart item not found' });
    res.json({ message: 'Removed from cart' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

// ───────────────────────────────
// CHECKOUT / ORDERS
// ───────────────────────────────

// POST /api/orders/checkout  { shipping_address }
async function checkout(req, res) {
  const { shipping_address } = req.body;
  if (!shipping_address) return res.status(400).json({ error: 'Shipping address is required' });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [cartItems] = await conn.query(
      `SELECT ci.quantity, p.id AS product_id, p.name, p.price, p.stock
       FROM cart_items ci JOIN products p ON ci.product_id = p.id
       WHERE ci.user_id = ?`,
      [req.user.id]
    );

    if (cartItems.length === 0) {
      await conn.rollback();
      return res.status(400).json({ error: 'Your cart is empty' });
    }

    // Verify stock for every item before committing to anything
    for (const item of cartItems) {
      if (item.stock < item.quantity) {
        await conn.rollback();
        return res.status(400).json({ error: `Not enough stock for "${item.name}"` });
      }
    }

    const total = cartItems.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);

    const [orderResult] = await conn.query(
      'INSERT INTO orders (user_id, total_amount, status, shipping_address) VALUES (?, ?, ?, ?)',
      [req.user.id, total.toFixed(2), 'pending', shipping_address]
    );
    const orderId = orderResult.insertId;

    for (const item of cartItems) {
      await conn.query(
        'INSERT INTO order_items (order_id, product_id, product_name, price, quantity) VALUES (?, ?, ?, ?, ?)',
        [orderId, item.product_id, item.name, item.price, item.quantity]
      );
      await conn.query('UPDATE products SET stock = stock - ? WHERE id = ?', [item.quantity, item.product_id]);
    }

    await conn.query('DELETE FROM cart_items WHERE user_id = ?', [req.user.id]);

    await conn.commit();
    res.status(201).json({ message: 'Order placed!', orderId, total: total.toFixed(2) });
  } catch (err) {
    await conn.rollback();
    console.error('Checkout error:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    conn.release();
  }
}

// GET /api/orders/my-orders
async function getMyOrders(req, res) {
  try {
    const [orders] = await db.query(
      'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    for (const order of orders) {
      const [items] = await db.query('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
      order.items = items;
    }
    res.json({ orders });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

// GET /api/orders  (admin only — all orders, all users)
async function getAllOrders(req, res) {
  try {
    const [orders] = await db.query(
      `SELECT o.*, u.name AS customer_name, u.email AS customer_email
       FROM orders o JOIN users u ON o.user_id = u.id
       ORDER BY o.created_at DESC`
    );
    res.json({ orders });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

// PATCH /api/orders/:id/status  (admin only)  { status }
async function updateOrderStatus(req, res) {
  const { status } = req.body;
  const valid = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
  if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  try {
    const [result] = await db.query('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Order not found' });
    res.json({ message: 'Order status updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = {
  getCart, addToCart, updateCartItem, removeCartItem,
  checkout, getMyOrders, getAllOrders, updateOrderStatus,
};