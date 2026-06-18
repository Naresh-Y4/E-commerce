// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ API routes FIRST
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// ✅ Serve frontend AFTER api routes
app.use(express.static(path.join(__dirname, 'public')));

// ✅ Fallback — anything not /api goes to index.html
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`

  🛍️  ShopApp running!               
   http://127.0.0.1:${PORT}            
  
  `);
});