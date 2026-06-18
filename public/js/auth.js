// ═══════════════════════════════════════════
// auth.js — shared across all pages
// ═══════════════════════════════════════════

const API = 'http://127.0.0.1:4000/api';

// ─── SESSION ───
function saveSession(user, token) {
  localStorage.setItem('shop_user', JSON.stringify(user));
  localStorage.setItem('shop_token', token);
}

function getUser() {
  const u = localStorage.getItem('shop_user');
  return u ? JSON.parse(u) : null;
}

function getToken() {
  return localStorage.getItem('shop_token');
}

function clearSession() {
  localStorage.removeItem('shop_user');
  localStorage.removeItem('shop_token');
}

function isLoggedIn() {
  return !!getToken();
}

function isAdmin() {
  const u = getUser();
  return u && u.role === 'admin';
}

// ─── API HELPER (adds auth header automatically) ───
async function apiFetch(endpoint, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API}${endpoint}`, { ...options, headers });

  if (res.status === 401) {
    clearSession();
    if (!window.location.pathname.includes('login.html')) {
      window.location.href = 'login.html';
    }
  }
  return res;
}

// ─── NAVBAR RENDER (runs on every page that has #navAuthArea) ───
function renderNavAuth() {
  const area = document.getElementById('navAuthArea');
  if (!area) return;

  const user = getUser();
  if (!user) {
    area.innerHTML = `<a href="login.html" class="nav-link" style="font-weight:600;">Sign In</a>`;
    return;
  }

  const initials = user.name.slice(0, 2).toUpperCase();
  area.innerHTML = `
    ${user.role === 'admin' ? `<div class="nav-link" onclick="window.location.href='admin.html'">⚙️ Admin</div>` : ''}
    <div class="user-pill" onclick="handleLogout()">
      <span class="avatar">${initials}</span>
      ${user.name.split(' ')[0]}
    </div>
  `;
}

function handleLogout() {
  clearSession();
  showToast('Signed out', 'info');
  setTimeout(() => window.location.href = 'index.html', 600);
}

// ─── LOGIN / REGISTER PANEL SWITCH (login.html only) ───
function showPanel(panel) {
  const login = document.getElementById('loginPanel');
  const register = document.getElementById('registerPanel');
  if (!login || !register) return;
  if (panel === 'login') {
    login.classList.remove('hidden');
    register.classList.add('hidden');
  } else {
    login.classList.add('hidden');
    register.classList.remove('hidden');
  }
}

function showAuthError(panelId, message) {
  const el = document.getElementById(panelId);
  el.textContent = message;
  el.classList.remove('hidden');
}

// ─── LOGIN ───
async function handleLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errorEl = document.getElementById('loginError');
  errorEl.classList.add('hidden');

  if (!email || !password) {
    return showAuthError('loginError', 'Please fill in both fields');
  }

  const btn = document.getElementById('loginBtn');
  btn.textContent = 'Signing in...';
  btn.disabled = true;

  try {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');

    saveSession(data.user, data.token);
    window.location.href = data.user.role === 'admin' ? 'admin.html' : 'index.html';
  } catch (err) {
    showAuthError('loginError', err.message);
  } finally {
    btn.textContent = 'Sign In';
    btn.disabled = false;
  }
}

// ─── REGISTER ───
async function handleRegister() {
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const errorEl = document.getElementById('registerError');
  errorEl.classList.add('hidden');

  if (!name || !email || !password) {
    return showAuthError('registerError', 'Please fill in all fields');
  }
  if (password.length < 6) {
    return showAuthError('registerError', 'Password must be at least 6 characters');
  }

  const btn = document.getElementById('registerBtn');
  btn.textContent = 'Creating account...';
  btn.disabled = true;

  try {
    const res = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');

    saveSession(data.user, data.token);
    showToast(`Welcome, ${data.user.name.split(' ')[0]}! 🎉`, 'success');
    setTimeout(() => {
      window.location.href = data.user.role === 'admin' ? 'admin.html' : 'index.html';
    }, 600);
  } catch (err) {
    showAuthError('registerError', err.message);
  } finally {
    btn.textContent = 'Create Account';
    btn.disabled = false;
  }
}

// ─── TOAST (shared by every page) ───
function showToast(msg, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('exit');
    setTimeout(() => toast.remove(), 250);
  }, 2800);
}

// ─── RUN ON EVERY PAGE LOAD ───
document.addEventListener('DOMContentLoaded', () => {
  renderNavAuth();

  // Protect admin.html — kick out non-admins
  if (window.location.pathname.includes('admin.html')) {
    if (!isLoggedIn() || !isAdmin()) {
      window.location.href = 'login.html';
    }
  }
});