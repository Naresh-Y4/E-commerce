// ═══════════════════════════════════════════
// admin.js — admin dashboard (products + orders)
// ═══════════════════════════════════════════

let adminProducts = [];
let adminCategories = [];
let adminOrders = [];
let editingProductId = null;

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('adminProductsTableBody')) {
    loadAdminCategories();
    loadAdminProducts();
  }
});

// ─── TAB SWITCHING ───
function switchAdminTab(tab) {
  document.querySelectorAll('.admin-nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.tab === tab);
  });
  document.getElementById('adminProductsTab').classList.toggle('hidden', tab !== 'products');
  document.getElementById('adminOrdersTab').classList.toggle('hidden', tab !== 'orders');

  if (tab === 'orders' && adminOrders.length === 0) {
    loadAdminOrders();
  }
}

// ═══════════════════════════════════════════
// PRODUCTS
// ═══════════════════════════════════════════

async function loadAdminCategories() {
  try {
    const res = await fetch(`${API}/products/categories`);
    const data = await res.json();
    adminCategories = data.categories || [];

    const select = document.getElementById('pCategory');
    select.innerHTML = adminCategories.map(c =>
      `<option value="${c.id}">${c.name}</option>`
    ).join('');
  } catch (err) {
    console.error('Failed to load categories', err);
  }
}

async function loadAdminProducts() {
  const tbody = document.getElementById('adminProductsTableBody');
  tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:30px; color:var(--ink-faint);">Loading...</td></tr>`;

  try {
    const res = await fetch(`${API}/products`);
    const data = await res.json();
    adminProducts = data.products || [];
    renderAdminProducts();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:30px; color:var(--danger);">Failed to load products</td></tr>`;
  }
}

function renderAdminProducts() {
  const tbody = document.getElementById('adminProductsTableBody');

  if (adminProducts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:30px; color:var(--ink-faint);">No products yet. Add your first one.</td></tr>`;
    return;
  }

  tbody.innerHTML = adminProducts.map(p => `
    <tr>
      <td><strong>${escapeHtml(p.name)}</strong></td>
      <td>${p.category_name || '—'}</td>
      <td class="mono">$${Number(p.price).toFixed(2)}</td>
      <td>${p.stock}</td>
      <td>
        <button class="btn-secondary" style="padding:6px 14px; font-size:12px;" onclick="openProductModal(${p.id})">Edit</button>
        <button class="btn-danger" style="margin-left:6px;" onclick="deleteProduct(${p.id})">Delete</button>
      </td>
    </tr>
  `).join('');
}

function openProductModal(productId = null) {
  editingProductId = productId;
  const modal = document.getElementById('productModal');
  const title = document.getElementById('productModalTitle');

  if (productId) {
    const p = adminProducts.find(x => x.id === productId);
    if (!p) return;
    title.textContent = 'Edit Product';
    document.getElementById('pName').value = p.name;
    document.getElementById('pDescription').value = p.description || '';
    document.getElementById('pPrice').value = p.price;
    document.getElementById('pStock').value = p.stock;
    document.getElementById('pCategory').value = p.category_id || '';
    document.getElementById('pImage').value = p.image || '';
  } else {
    title.textContent = 'Add Product';
    document.getElementById('pName').value = '';
    document.getElementById('pDescription').value = '';
    document.getElementById('pPrice').value = '';
    document.getElementById('pStock').value = '';
    document.getElementById('pImage').value = '';
  }

  modal.classList.remove('hidden');
}

function closeProductModal() {
  document.getElementById('productModal').classList.add('hidden');
  editingProductId = null;
}

async function saveProduct() {
  const name = document.getElementById('pName').value.trim();
  const description = document.getElementById('pDescription').value.trim();
  const price = parseFloat(document.getElementById('pPrice').value);
  const stock = parseInt(document.getElementById('pStock').value);
  const category_id = document.getElementById('pCategory').value;
  const image = document.getElementById('pImage').value.trim() || '/images/placeholder.jpg';

  if (!name || isNaN(price)) {
    showToast('Name and price are required', 'error');
    return;
  }

  const btn = document.getElementById('saveProductBtn');
  btn.textContent = 'Saving...';
  btn.disabled = true;

  const payload = { name, description, price, stock: stock || 0, category_id, image };

  try {
    let res;
    if (editingProductId) {
      res = await apiFetch(`/products/${editingProductId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    } else {
      res = await apiFetch('/products', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to save product');

    showToast(editingProductId ? 'Product updated' : 'Product created', 'success');
    closeProductModal();
    loadAdminProducts();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.textContent = 'Save Product';
    btn.disabled = false;
  }
}

async function deleteProduct(id) {
  if (!confirm('Delete this product? This cannot be undone.')) return;

  try {
    const res = await apiFetch(`/products/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete product');
    showToast('Product deleted', 'success');
    loadAdminProducts();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ═══════════════════════════════════════════
// ORDERS
// ═══════════════════════════════════════════

async function loadAdminOrders() {
  const tbody = document.getElementById('adminOrdersTableBody');
  tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:var(--ink-faint);">Loading...</td></tr>`;

  try {
    const res = await apiFetch('/orders');
    const data = await res.json();
    adminOrders = data.orders || [];
    renderAdminOrders();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:var(--danger);">Failed to load orders</td></tr>`;
  }
}

function renderAdminOrders() {
  const tbody = document.getElementById('adminOrdersTableBody');

  if (adminOrders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:var(--ink-faint);">No orders yet.</td></tr>`;
    return;
  }

  const statuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

  tbody.innerHTML = adminOrders.map(o => `
    <tr>
      <td class="mono">#${o.id}</td>
      <td>${escapeHtml(o.customer_name)}<br><span style="color:var(--ink-faint); font-size:12px;">${escapeHtml(o.customer_email)}</span></td>
      <td class="mono">$${Number(o.total_amount).toFixed(2)}</td>
      <td><span class="status-pill ${o.status}">${o.status}</span></td>
      <td>${new Date(o.created_at).toLocaleDateString()}</td>
      <td>
        <select onchange="updateOrderStatus(${o.id}, this.value)" style="padding:6px 10px; border:1.5px solid var(--line); border-radius:6px; font-family:inherit; font-size:12px;">
          ${statuses.map(s => `<option value="${s}" ${s === o.status ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </td>
    </tr>
  `).join('');
}

async function updateOrderStatus(orderId, newStatus) {
  try {
    const res = await apiFetch(`/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus }),
    });
    if (!res.ok) throw new Error('Failed to update status');
    showToast('Order status updated', 'success');
    loadAdminOrders();
  } catch (err) {
    showToast(err.message, 'error');
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