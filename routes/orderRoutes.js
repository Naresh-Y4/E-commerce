// routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const {
  getCart, addToCart, updateCartItem, removeCartItem,
  checkout, getMyOrders, getAllOrders, updateOrderStatus,
} = require('../controllers/orderController');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');

// All order/cart routes require login
router.use(verifyToken);

// Cart
router.get('/cart', getCart);
router.post('/cart', addToCart);
router.put('/cart/:cartItemId', updateCartItem);
router.delete('/cart/:cartItemId', removeCartItem);

// Checkout & personal orders
router.post('/checkout', checkout);
router.get('/my-orders', getMyOrders);

// Admin — all orders across all users
router.get('/', requireAdmin, getAllOrders);
router.patch('/:id/status', requireAdmin, updateOrderStatus);

module.exports = router;