// ═══════════════════════════════════════════
// catalog.js — product grid, search, cart
// ═══════════════════════════════════════════

let allProducts = [];
let allCategories = [];
let activeCategory = '';
let searchTimer = null;

// ─── INIT ───
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('productGrid')) {
    loadCategories();
    loadProducts();
  }
  if (document.getElementById('cartItemsList')) {
    loadCart();
  }
  updateCartBadge();
});

// ═══════════════════════════════════════════
// PRODUCT CATALOG (index.html)
// ═══════════════════════════════════════════

async function loadCategories() {
  try {
    const res = await fetch(`${API}/products/categories`);
    const data = await res.json();
    allCategories = data.categories || [];

    const bar = document.getElementById('categoryBar');
    allCategories.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = 'cat-chip';
      btn.dataset.slug = cat.slug;
      btn.textContent = cat.name;
      btn.onclick = () => filterCategory(cat.slug);
      bar.appendChild(btn);
    });
  } catch (err) {
    console.error('Failed to load categories', err);
  }
}

async function loadProducts() {
  const grid = document.getElementById('productGrid');
  grid.innerHTML = `<div class="empty-state"><div class="emoji">⏳</div><p>Loading products...</p></div>`;

  try {
    const params = new URLSearchParams();
    if (activeCategory) params.append('category', activeCategory);
    const searchVal = document.getElementById('searchInput')?.value.trim();
    if (searchVal) params.append('search', searchVal);

    const res = await fetch(`${API}/products?${params}`);
    const data = await res.json();
    allProducts = data.products || [];
    renderProducts();
  } catch (err) {
    grid.innerHTML = `<div class="empty-state"><div class="emoji">⚠️</div><h3>Couldn't load products</h3><p>Check that the server is running.</p></div>`;
  }
}

function renderProducts() {
  const grid = document.getElementById('productGrid');

  if (allProducts.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="emoji">🔍</div>
        <h3>No products found</h3>
        <p>Try a different search term or category.</p>
      </div>`;
    return;
  }

  grid.innerHTML = allProducts.map((p, i) => renderProductCard(p, i)).join('');
}

const CATEGORY_EMOJI = {
  'tech-electronics': '🎧',
  'fitness-outdoor': '🏋️',
  'kitchen-home': '🍳',
  'apparel-lifestyle': '👕',
};

function renderProductCard(p, index) {
  const outOfStock = p.stock <= 0;
  const lowStock = p.stock > 0 && p.stock <= 10;
  const emoji = CATEGORY_EMOJI[p.category_slug] || '📦';

  let stockLabel = `${p.stock} in stock`;
  let stockClass = '';
  if (outOfStock) { stockLabel = 'Out of stock'; stockClass = 'out'; }
  else if (lowStock) { stockLabel = `Only ${p.stock} left`; stockClass = 'low'; }

  return `
  <div class="product-card ${outOfStock ? 'out-of-stock' : ''}" style="animation-delay:${index * 0.04}s" onclick="goToProduct(${p.id})">
    <div class="product-image-wrap">
      <span class="placeholder-emoji">${emoji}</span>
      <div class="price-tag">$${Number(p.price).toFixed(2)}</div>
      <div class="stock-pip ${stockClass}">${stockLabel}</div>
    </div>
    <div class="product-info">
      <span class="product-cat">${p.category_name || 'General'}</span>
      <div class="product-name">${escapeHtml(p.name)}</div>
      <div class="product-desc">${escapeHtml(p.description || '')}</div>
      <button class="add-cart-btn" ${outOfStock ? 'disabled' : ''} onclick="event.stopPropagation(); addToCart(${p.id}, this)">
        ${outOfStock ? 'Out of Stock' : 'Add to Cart'}
      </button>
    </div>
  </div>`;
}

function goToProduct(id) {
  // Single-page catalog for now — could expand to a detail page later.
  // Currently a no-op placeholder so clicking the card doesn't error.
}

function filterCategory(slug) {
  activeCategory = slug;
  document.querySelectorAll('.cat-chip').forEach(chip => {
    chip.classList.toggle('active', chip.dataset.slug === slug);
  });
  loadProducts();
}

function handleSearch(value) {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => loadProducts(), 350);
}

// ─── ADD TO CART ───
async function addToCart(productId, btnEl) {
  if (!isLoggedIn()) {
    showToast('Please sign in to add items to your cart', 'info');
    setTimeout(() => window.location.href = 'login.html', 800);
    return;
  }

  const originalText = btnEl.textContent;
  btnEl.textContent = 'Adding...';
  btnEl.disabled = true;

  try {
    const res = await apiFetch('/orders/cart', {
      method: 'POST',
      body: JSON.stringify({ product_id: productId, quantity: 1 }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to add to cart');

    btnEl.textContent = 'Added ✓';
    btnEl.classList.add('added');
    showToast('Added to cart', 'success');
    updateCartBadge();

    setTimeout(() => {
      btnEl.textContent = originalText;
      btnEl.classList.remove('added');
      btnEl.disabled = false;
    }, 1500);
  } catch (err) {
    showToast(err.message, 'error');
    btnEl.textContent = originalText;
    btnEl.disabled = false;
  }
}

async function updateCartBadge() {
  const badge = document.getElementById('cartBadge');
  if (!badge || !isLoggedIn()) return;

  try {
    const res = await apiFetch('/orders/cart');
    const data = await res.json();
    const count = (data.items || []).reduce((sum, item) => sum + item.quantity, 0);
    if (count > 0) {
      badge.textContent = count;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  } catch (err) {
    // silent — badge just won't update
  }
}

// ═══════════════════════════════════════════
// CART PAGE (cart.html)
// ═══════════════════════════════════════════

let cartData = { items: [], total: '0.00' };

async function loadCart() {
  if (!isLoggedIn()) {
    window.location.href = 'login.html';
    return;
  }

  try {
    const res = await apiFetch('/orders/cart');
    const data = await res.json();
    cartData = data;
    renderCart();
  } catch (err) {
    showToast('Failed to load cart', 'error');
  }
}

function renderCart() {
  const list = document.getElementById('cartItemsList');
  const emptyState = document.getElementById('cartEmptyState');

  if (cartData.items.length === 0) {
    list.innerHTML = '';
    emptyState.style.display = 'flex';
    document.getElementById('summarySubtotal').textContent = '$0.00';
    document.getElementById('summaryTotal').textContent = '$0.00';
    document.getElementById('checkoutBtn').disabled = true;
    return;
  }

  emptyState.style.display = 'none';
  document.getElementById('checkoutBtn').disabled = false;

  list.innerHTML = cartData.items.map(item => `
    <div class="cart-item">
      <div class="ph">${CATEGORY_EMOJI[item.category_slug] || '📦'}</div>
      <div class="cart-item-info">
        <div class="cart-item-name">${escapeHtml(item.name)}</div>
        <div class="cart-item-price mono">$${Number(item.price).toFixed(2)} each</div>
        <div class="qty-control">
          <button class="qty-btn" onclick="changeQty(${item.cart_item_id}, ${item.quantity - 1})">−</button>
          <span class="mono">${item.quantity}</span>
          <button class="qty-btn" onclick="changeQty(${item.cart_item_id}, ${item.quantity + 1})">+</button>
        </div>
        <div class="remove-link" onclick="removeFromCart(${item.cart_item_id})">Remove</div>
      </div>
      <div class="mono" style="font-weight:600;">$${(Number(item.price) * item.quantity).toFixed(2)}</div>
    </div>
  `).join('');

  document.getElementById('summarySubtotal').textContent = `$${cartData.total}`;
  document.getElementById('summaryTotal').textContent = `$${cartData.total}`;
}

async function changeQty(cartItemId, newQty) {
  if (newQty < 1) return removeFromCart(cartItemId);

  try {
    const res = await apiFetch(`/orders/cart/${cartItemId}`, {
      method: 'PUT',
      body: JSON.stringify({ quantity: newQty }),
    });
    if (!res.ok) throw new Error('Failed to update quantity');
    loadCart();
    updateCartBadge();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function removeFromCart(cartItemId) {
  try {
    const res = await apiFetch(`/orders/cart/${cartItemId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to remove item');
    showToast('Removed from cart', 'info');
    loadCart();
    updateCartBadge();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleCheckout() {
  const address = document.getElementById('shippingAddress').value.trim();
  if (!address) {
    showToast('Please enter a shipping address', 'error');
    return;
  }

  const btn = document.getElementById('checkoutBtn');
  btn.textContent = 'Placing order...';
  btn.disabled = true;

  try {
    const res = await apiFetch('/orders/checkout', {
      method: 'POST',
      body: JSON.stringify({ shipping_address: address }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Checkout failed');

    showToast(`Order placed! Total: $${data.total} 🎉`, 'success');
    setTimeout(() => window.location.href = 'index.html', 1500);
  } catch (err) {
    showToast(err.message, 'error');
    btn.textContent = 'Place Order';
    btn.disabled = false;
  }
}

// ─── HELPER ───
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}