-- ============================================
-- E-Commerce Database Schema
-- ============================================

CREATE DATABASE IF NOT EXISTS ecommerce_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ecommerce_db;

-- ───────────────────────────────
-- USERS (customers + admin)
-- ───────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user', 'admin') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ───────────────────────────────
-- CATEGORIES
-- ───────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL
);

-- ───────────────────────────────
-- PRODUCTS
-- ───────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  image VARCHAR(255),
  stock INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- ───────────────────────────────
-- CART (persistent per user)
-- ───────────────────────────────
CREATE TABLE IF NOT EXISTS cart_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT DEFAULT 1,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_product (user_id, product_id)
);

-- ───────────────────────────────
-- ORDERS
-- ───────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  status ENUM('pending','processing','shipped','delivered','cancelled') DEFAULT 'pending',
  shipping_address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ───────────────────────────────
-- ORDER ITEMS (snapshot of price at purchase time)
-- ───────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  product_name VARCHAR(200) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  quantity INT NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

-- ───────────────────────────────
-- SEED CATEGORIES
-- ───────────────────────────────
INSERT INTO categories (name, slug) VALUES
  ('Tech & Electronics', 'tech-electronics'),
  ('Fitness & Outdoor', 'fitness-outdoor'),
  ('Kitchen & Home', 'kitchen-home'),
  ('Apparel & Lifestyle', 'apparel-lifestyle');

-- ───────────────────────────────
-- SEED PRODUCTS
-- ───────────────────────────────
INSERT INTO products (category_id, name, description, price, image, stock) VALUES
(1, 'Wireless Noise-Canceling Headphones', 'Over-ear Bluetooth headphones with active noise cancellation, 40-hour battery life, and high-fidelity sound.', 149.99, '/images/headphones.jpg', 45),
(1, 'Mechanical Gaming Keyboard', 'Tactile blue switches, custom RGB backlighting, and a durable aluminum frame built for precision gaming.', 89.99, '/images/keyboard.jpg', 30),
(1, 'Ergonomic Wireless Mouse', 'High-precision optical mouse designed to reduce wrist strain, featuring programmable side buttons.', 49.99, '/images/mouse.jpg', 60),
(1, 'Dual-Port USB-C Fast Charger', 'Compact 65W GaN wall charger capable of safely fast-charging a laptop and a smartphone simultaneously.', 29.99, '/images/charger.jpg', 120),
(1, '1080p Ultra-Wide Webcam', 'High-definition webcam with a built-in privacy shutter and dual microphones, perfect for video calls.', 39.99, '/images/webcam.jpg', 25),

(2, 'Stainless Steel Vacuum Water Bottle', 'Double-wall insulated flask that keeps drinks ice-cold for 24 hours or piping hot for 12 hours.', 24.99, '/images/flask.jpg', 150),
(2, 'High-Density Yoga Mat', 'Non-slip, 6mm eco-friendly cushioning mat with an alignment-line design to assist your poses.', 34.99, '/images/yogamat.jpg', 40),
(2, 'Adjustable Dumbbell Set', 'Compact all-in-one steel dumbbells that easily adjust from 5 to 25 pounds with a simple dial turn.', 199.99, '/images/dumbbells.jpg', 15),
(2, 'Waterproof Trail Backpack', 'Lightweight 30L outdoor backpack featuring a rain cover, walking pole attachments, and a hydration bladder sleeve.', 59.99, '/images/backpack.jpg', 22),
(2, 'Smart Fitness Tracker', 'Slim wristband that automatically tracks heart rate, sleep cycles, steps, and sports metrics.', 79.99, '/images/fitness_tracker.jpg', 55),

(3, 'Electric Gooseneck Kettle', 'Matte black rapid-boil kettle featuring precise manual temperature controls for pour-over coffee.', 69.99, '/images/kettle.jpg', 18),
(3, 'Digital Food Scale', 'Sleek tempered glass scale that measures accurately in grams, ounces, and milliliters with a clear LCD screen.', 14.99, '/images/scale.jpg', 200),
(3, 'Aromatherapy Essential Oil Diffuser', '500ml quiet ultrasonic cool mist humidifier with a dynamic 7-color ambient LED nightlight.', 27.99, '/images/diffuser.jpg', 85),
(3, 'Ceramic Non-Stick Skillet', '10-inch heavy-duty aluminum frying pan coated with a toxin-free, easy-clean ceramic finish.', 44.99, '/images/skillet.jpg', 32),
(3, 'Automatic Milk Frother', 'One-button countertop frother that creates cold or hot silky milk foam for lattes and cappuccinos.', 32.99, '/images/frother.jpg', 40),

(4, 'Classic Canvas Sneakers', 'Low-top everyday casual lace-up shoes made from breathable canvas with a flexible vulcanized rubber sole.', 49.99, '/images/sneakers.jpg', 70),
(4, 'Polarized Classic Sunglasses', 'UV400 protected lenses wrapped in a lightweight vintage frame, perfect for driving or beach days.', 19.99, '/images/sunglasses.jpg', 110),
(4, 'Minimalist Leather Wallet', 'Slim genuine leather bifold wallet with RFID-blocking protection holding up to 8 cards and cash.', 29.99, '/images/wallet.jpg', 95),
(4, 'Cotton Crewneck Sweatshirt', 'Ultra-soft fleece lining knit sweatshirt designed for standard-fit unisex loungewear comfort.', 38.99, '/images/sweatshirt.jpg', 50),
(4, 'Stainless Steel Grooming Trimmer', 'Cordless, waterproof precision hair and beard trimmer packing self-sharpening steel blades.', 35.99, '/images/trimmer.jpg', 42);