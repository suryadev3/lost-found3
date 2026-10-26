/* ============================================================
   Lost & Found Portal - Frontend Application
   ============================================================ */

const API = '/api';
let currentUser = null;
let currentPage = 'home';

// ---------- Helpers ----------
function getToken() {
  return localStorage.getItem('token');
}

function setAuth(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
  currentUser = user;
  updateNavbar();
}

function clearAuth() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  currentUser = null;
  updateNavbar();
}

function authHeaders() {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function api(path, options = {}) {
  const headers = {
    ...authHeaders(),
    ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
    ...options.headers
  };
  const res = await fetch(`${API}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  const icon = document.getElementById('toast-icon');
  const text = document.getElementById('toast-msg');
  text.textContent = msg;
  icon.className = type === 'success' ? 'fas fa-check-circle text-green-400' :
                   type === 'error' ? 'fas fa-exclamation-circle text-red-400' :
                   'fas fa-info-circle text-blue-400';
  el.classList.remove('hidden');
  el.classList.remove('translate-y-4', 'opacity-0');
  setTimeout(() => {
    el.classList.add('translate-y-4', 'opacity-0');
    setTimeout(() => el.classList.add('hidden'), 300);
  }, 3500);
}

function showModal(title, html) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = html;
  const m = document.getElementById('modal');
  m.classList.remove('hidden');
  m.classList.add('flex');
}

function closeModal() {
  const m = document.getElementById('modal');
  m.classList.add('hidden');
  m.classList.remove('flex');
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function scoreColor(score) {
  if (score >= 0.6) return 'text-emerald-600';
  if (score >= 0.4) return 'text-amber-600';
  return 'text-slate-600';
}

function badgeType(type) {
  return type === 'lost' ? 'badge-lost' : 'badge-found';
}

function badgeStatus(status) {
  return status === 'Open' ? 'badge-open' : status === 'Matched' ? 'badge-matched' : 'badge-returned';
}

// ---------- Navbar ----------
function updateNavbar() {
  const navLinks = document.getElementById('nav-links');
  const mobileMenu = document.getElementById('mobile-menu');
  const authBtns = document.getElementById('auth-buttons');
  const userMenu = document.getElementById('user-menu');
  const userName = document.getElementById('user-name');

  if (currentUser) {
    authBtns.classList.add('hidden');
    userMenu.classList.remove('hidden');
    userMenu.classList.add('flex');
    if (currentUser.is_admin) {
      userName.textContent = currentUser.name + ' (Admin)';
    } else if (currentUser.roll_no) {
      userName.textContent = `${currentUser.name} (Roll ${currentUser.roll_no})`;
    } else {
      userName.textContent = currentUser.name;
    }

    const links = [
      { page: 'home', label: 'Home', icon: 'fa-home' },
      { page: 'browse', label: 'Browse', icon: 'fa-search' },
      { page: 'report', label: 'Report Item', icon: 'fa-plus-circle' },
      { page: 'my-reports', label: 'My Reports', icon: 'fa-list' },
    ];
    if (currentUser.is_admin) {
      links.push({ page: 'admin', label: 'Admin', icon: 'fa-shield-alt' });
    }

    navLinks.innerHTML = links.map(l => `
      <button onclick="showPage('${l.page}')" class="px-3 py-2 text-sm font-medium rounded-lg transition ${currentPage === l.page ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:bg-slate-100'}">
        <i class="fas ${l.icon} mr-1.5"></i>${l.label}
      </button>
    `).join('');

    mobileMenu.innerHTML = links.map(l => `
      <button onclick="showPage('${l.page}'); toggleMobileMenu()" class="block w-full text-left px-3 py-2 text-sm font-medium rounded-lg ${currentPage === l.page ? 'bg-primary-50 text-primary-700' : 'text-slate-600'}">
        <i class="fas ${l.icon} mr-2"></i>${l.label}
      </button>
    `).join('');
  } else {
    authBtns.classList.remove('hidden');
    userMenu.classList.add('hidden');
    userMenu.classList.remove('flex');
    navLinks.innerHTML = `
      <button onclick="showPage('home')" class="px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Home</button>
    `;
    mobileMenu.innerHTML = `
      <button onclick="showPage('home'); toggleMobileMenu()" class="block w-full text-left px-3 py-2 text-sm">Home</button>
      <button onclick="showPage('login'); toggleMobileMenu()" class="block w-full text-left px-3 py-2 text-sm">Login</button>
      <button onclick="showPage('register'); toggleMobileMenu()" class="block w-full text-left px-3 py-2 text-sm">Register</button>
    `;
  }
}

function toggleMobileMenu() {
  document.getElementById('mobile-menu').classList.toggle('hidden');
}

function logout() {
  clearAuth();
  toast('Logged out successfully');
  showPage('home');
}

// ---------- Pages ----------
function showPage(page) {
  currentPage = page;
  updateNavbar();
  const app = document.getElementById('app');
  app.innerHTML = '<div class="flex justify-center py-20"><div class="spinner"></div></div>';

  const pages = {
    home: renderHome,
    login: renderLogin,
    register: renderRegister,
    verify: renderVerify,
    forgot: renderForgot,
    reset: renderReset,
    report: renderReportForm,
    browse: renderBrowse,
    'my-reports': renderMyReports,
    admin: renderAdmin
  };

  const fn = pages[page] || renderHome;
  setTimeout(() => {
    fn().then(html => {
      app.innerHTML = `<div class="page-enter">${html}</div>`;
    }).catch(err => {
      app.innerHTML = `<div class="text-center py-20 text-red-600">${err.message}</div>`;
    });
  }, 50);
}

// ---------- HOME ----------
async function renderHome() {
  return `
    <div class="text-center max-w-3xl mx-auto pt-8 pb-16">
      <div class="inline-flex items-center gap-2 bg-primary-50 text-primary-700 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
        <i class="fas fa-robot"></i> AI-Powered Matching
      </div>
      <h1 class="text-4xl sm:text-5xl font-bold text-slate-900 mb-4 leading-tight">
        Reunite with your<br><span class="text-primary-600">lost belongings</span>
      </h1>
      <p class="text-lg text-slate-600 mb-10 max-w-xl mx-auto">
        Report lost or found items on campus. Our smart text-matching engine automatically suggests likely matches so recovery is faster and easier.
      </p>
      <div class="flex flex-wrap justify-center gap-4">
        ${currentUser ? `
          <button onclick="showPage('report')" class="btn-primary text-base px-8 py-3">
            <i class="fas fa-plus-circle mr-2"></i> Report an Item
          </button>
          <button onclick="showPage('browse')" class="btn-secondary text-base px-8 py-3">
            <i class="fas fa-search mr-2"></i> Browse Reports
          </button>
        ` : `
          <button onclick="showPage('register')" class="btn-primary text-base px-8 py-3">
            Get Started — It's Free
          </button>
          <button onclick="showPage('login')" class="btn-secondary text-base px-8 py-3">
            Login
          </button>
        `}
      </div>
    </div>

    <div class="grid md:grid-cols-3 gap-6 mt-8">
      <div class="card p-6 text-center">
        <div class="w-14 h-14 bg-blue-100 text-primary-600 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4">
          <i class="fas fa-camera"></i>
        </div>
        <h3 class="font-semibold text-lg mb-2">Photo Reports</h3>
        <p class="text-slate-600 text-sm">Upload a photo, add description & location. Takes under a minute.</p>
      </div>
      <div class="card p-6 text-center">
        <div class="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4">
          <i class="fas fa-brain"></i>
        </div>
        <h3 class="font-semibold text-lg mb-2">AI Matching</h3>
        <p class="text-slate-600 text-sm">Lightweight text similarity engine compares new reports and suggests matches instantly.</p>
      </div>
      <div class="card p-6 text-center">
        <div class="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4">
          <i class="fas fa-tasks"></i>
        </div>
        <h3 class="font-semibold text-lg mb-2">Status Tracking</h3>
        <p class="text-slate-600 text-sm">Track items from Open → Matched → Returned. Full transparency.</p>
      </div>
    </div>

    <div class="mt-16 card p-8 bg-gradient-to-br from-primary-600 to-primary-800 text-white">
      <div class="max-w-2xl mx-auto text-center">
        <h2 class="text-2xl font-bold mb-3">How it works</h2>
        <div class="grid sm:grid-cols-3 gap-6 mt-8 text-left">
          <div>
            <div class="text-3xl font-bold text-primary-200 mb-1">1</div>
            <p class="font-medium">Report</p>
            <p class="text-primary-100 text-sm mt-1">Submit lost or found item with details & optional photo.</p>
          </div>
          <div>
            <div class="text-3xl font-bold text-primary-200 mb-1">2</div>
            <p class="font-medium">Match</p>
            <p class="text-primary-100 text-sm mt-1">AI compares title, description & location against opposite reports.</p>
          </div>
          <div>
            <div class="text-3xl font-bold text-primary-200 mb-1">3</div>
            <p class="font-medium">Recover</p>
            <p class="text-primary-100 text-sm mt-1">View suggestions, update status, and reunite with your item.</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ---------- AUTH PAGES ----------
async function renderLogin() {
  return `
    <div class="max-w-md mx-auto">
      <div class="card p-8">
        <h2 class="text-2xl font-bold text-center mb-1">Welcome back</h2>
        <p class="text-slate-500 text-center text-sm mb-6">Login to your account</p>
        <form id="login-form" class="space-y-4">
          <div>
            <label class="label">Email</label>
            <input type="email" name="email" class="input" required placeholder="you@college.edu" />
          </div>
          <div>
            <label class="label">Password</label>
            <input type="password" name="password" class="input" required placeholder="••••••••" />
          </div>
          <button type="submit" class="btn-primary w-full">Login</button>
        </form>
        <div class="mt-5 text-center text-sm space-y-2">
          <p><a href="#" onclick="showPage('forgot'); return false;" class="text-primary-600 hover:underline">Forgot password?</a></p>
          <p class="text-slate-500">Don't have an account? <a href="#" onclick="showPage('register'); return false;" class="text-primary-600 font-medium hover:underline">Register</a></p>
        </div>
      </div>
    </div>
  `;
}

async function renderRegister() {
  return `
    <div class="max-w-md mx-auto">
      <div class="card p-8">
        <h2 class="text-2xl font-bold text-center mb-1">Create account</h2>
        <p class="text-slate-500 text-center text-sm mb-6">Only Computer Hardware Engineering (CHE) students can register using Register Number</p>
        <form id="register-form" class="space-y-4">
          <div>
            <label class="label">Register Number *</label>
            <input type="text" name="register_no" class="input" required placeholder="e.g. 2401150518" maxlength="12" />
            <p class="text-xs text-slate-500 mt-1">Enter your official college Register Number</p>
          </div>
          <div>
            <label class="label">Email *</label>
            <input type="email" name="email" class="input" required placeholder="your.email@gmail.com" />
          </div>
          <div>
            <label class="label">Password *</label>
            <input type="password" name="password" class="input" required minlength="6" placeholder="Min. 6 characters" />
          </div>
          <button type="submit" class="btn-primary w-full">Register</button>
        </form>
        <p class="mt-5 text-center text-sm text-slate-500">
          Already have an account? <a href="#" onclick="showPage('login'); return false;" class="text-primary-600 font-medium hover:underline">Login</a>
        </p>
      </div>
    </div>
  `;
}

async function renderVerify() {
  const email = sessionStorage.getItem('pendingEmail') || '';
  return `
    <div class="max-w-md mx-auto">
      <div class="card p-8">
        <h2 class="text-2xl font-bold text-center mb-1">Verify Email</h2>
        <p class="text-slate-500 text-center text-sm mb-6">Enter the verification code (check server console in demo)</p>
        <form id="verify-form" class="space-y-4">
          <div>
            <label class="label">Email</label>
            <input type="email" name="email" class="input" required value="${email}" />
          </div>
          <div>
            <label class="label">Verification Code</label>
            <input type="text" name="code" class="input uppercase tracking-widest text-center text-lg" required placeholder="ABC12345" maxlength="8" />
          </div>
          <button type="submit" class="btn-primary w-full">Verify & Login</button>
        </form>
      </div>
    </div>
  `;
}

async function renderForgot() {
  return `
    <div class="max-w-md mx-auto">
      <div class="card p-8">
        <h2 class="text-2xl font-bold text-center mb-1">Forgot Password</h2>
        <p class="text-slate-500 text-center text-sm mb-6">We'll send a reset code (shown in server console)</p>
        <form id="forgot-form" class="space-y-4">
          <div>
            <label class="label">Email</label>
            <input type="email" name="email" class="input" required />
          </div>
          <button type="submit" class="btn-primary w-full">Send Reset Code</button>
        </form>
        <p class="mt-4 text-center text-sm"><a href="#" onclick="showPage('login'); return false;" class="text-primary-600">Back to Login</a></p>
      </div>
    </div>
  `;
}

async function renderReset() {
  const email = sessionStorage.getItem('resetEmail') || '';
  return `
    <div class="max-w-md mx-auto">
      <div class="card p-8">
        <h2 class="text-2xl font-bold text-center mb-1">Reset Password</h2>
        <form id="reset-form" class="space-y-4">
          <div>
            <label class="label">Email</label>
            <input type="email" name="email" class="input" required value="${email}" />
          </div>
          <div>
            <label class="label">Reset Code</label>
            <input type="text" name="code" class="input uppercase tracking-widest text-center" required maxlength="8" />
          </div>
          <div>
            <label class="label">New Password</label>
            <input type="password" name="newPassword" class="input" required minlength="6" />
          </div>
          <button type="submit" class="btn-primary w-full">Reset Password</button>
        </form>
      </div>
    </div>
  `;
}

// ---------- REPORT FORM ----------
async function renderReportForm() {
  if (!currentUser) {
    showPage('login');
    return '<p class="text-center">Please login first.</p>';
  }
  const { categories } = await api('/reports/categories');
  return `
    <div class="max-w-2xl mx-auto">
      <h2 class="text-2xl font-bold mb-6">Report a Lost or Found Item</h2>
      <div class="card p-6 sm:p-8">
        <form id="report-form" class="space-y-5" enctype="multipart/form-data">
          <div class="grid sm:grid-cols-2 gap-4">
            <div>
              <label class="label">Type *</label>
              <select name="type" class="input" required>
                <option value="">Select type</option>
                <option value="lost">I Lost Something</option>
                <option value="found">I Found Something</option>
              </select>
            </div>
            <div>
              <label class="label">Category *</label>
              <select name="category" class="input" required>
                <option value="">Select category</option>
                ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
              </select>
            </div>
          </div>
          <div>
            <label class="label">Title *</label>
            <input type="text" name="title" class="input" required placeholder="e.g. Black Samsung Galaxy S21" maxlength="100" />
          </div>
          <div>
            <label class="label">Description *</label>
            <textarea name="description" class="input" rows="4" required placeholder="Color, brand, distinctive marks, when & where you last saw it..."></textarea>
          </div>
          <div>
            <label class="label">Location *</label>
            <input type="text" name="location" class="input" required placeholder="e.g. Library 2nd floor, near main gate, Canteen" />
          </div>
          <div>
            <label class="label">Photo (optional)</label>
            <input type="file" name="photo" accept="image/*" class="input py-2" />
            <p class="text-xs text-slate-500 mt-1">Max 5MB. JPEG, PNG, WebP.</p>
          </div>
          <button type="submit" class="btn-primary w-full py-3">
            <i class="fas fa-paper-plane mr-2"></i> Submit Report
          </button>
        </form>
      </div>
    </div>
  `;
}

// ---------- BROWSE ----------
async function renderBrowse() {
  if (!currentUser) {
    showPage('login');
    return '';
  }
  const { categories } = await api('/reports/categories');
  return `
    <div>
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h2 class="text-2xl font-bold">Browse Reports</h2>
        <div class="flex flex-wrap gap-2">
          <select id="filter-type" class="input w-auto py-2 text-sm" onchange="loadBrowse()">
            <option value="">All Types</option>
            <option value="lost">Lost</option>
            <option value="found">Found</option>
          </select>
          <select id="filter-category" class="input w-auto py-2 text-sm" onchange="loadBrowse()">
            <option value="">All Categories</option>
            ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
          </select>
          <input type="search" id="filter-q" class="input w-40 sm:w-52 py-2 text-sm" placeholder="Search..." onkeyup="if(event.key==='Enter')loadBrowse()" />
          <button onclick="loadBrowse()" class="btn-secondary py-2 px-3 text-sm"><i class="fas fa-search"></i></button>
        </div>
      </div>
      <div id="browse-results" class="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <div class="col-span-full flex justify-center py-12"><div class="spinner"></div></div>
      </div>
    </div>
  `;
}

async function loadBrowse() {
  const type = document.getElementById('filter-type')?.value || '';
  const category = document.getElementById('filter-category')?.value || '';
  const q = document.getElementById('filter-q')?.value || '';
  const container = document.getElementById('browse-results');
  if (!container) return;
  container.innerHTML = '<div class="col-span-full flex justify-center py-12"><div class="spinner"></div></div>';

  try {
    const params = new URLSearchParams();
    if (type) params.set('type', type);
    if (category) params.set('category', category);
    if (q) params.set('q', q);
    const { reports } = await api(`/reports?${params}`);
    if (reports.length === 0) {
      container.innerHTML = '<div class="col-span-full text-center py-16 text-slate-500"><i class="fas fa-inbox text-4xl mb-3 opacity-40"></i><p>No reports found.</p></div>';
      return;
    }
    container.innerHTML = reports.map(r => reportCard(r)).join('');
  } catch (err) {
    container.innerHTML = `<div class="col-span-full text-center text-red-600 py-8">${err.message}</div>`;
  }
}

function reportCard(r, showOwner = true) {
  return `
    <div class="card overflow-hidden flex flex-col">
      ${r.photo_path ? `<img src="${r.photo_path}" alt="" class="report-img" onerror="this.style.display='none'" />` : `
        <div class="report-img flex items-center justify-center text-slate-300 text-4xl bg-slate-100">
          <i class="fas fa-image"></i>
        </div>
      `}
      <div class="p-4 flex-1 flex flex-col">
        <div class="flex items-center gap-2 mb-2">
          <span class="badge ${badgeType(r.type)}">${r.type.toUpperCase()}</span>
          <span class="badge ${badgeStatus(r.status)}">${r.status}</span>
        </div>
        <h3 class="font-semibold text-slate-900 line-clamp-1">${escapeHtml(r.title)}</h3>
        <p class="text-sm text-slate-500 mt-1 line-clamp-2 flex-1">${escapeHtml(r.description)}</p>
        <div class="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500 space-y-1">
          <div><i class="fas fa-map-marker-alt w-4 text-slate-400"></i> ${escapeHtml(r.location)}</div>
          <div><i class="fas fa-tag w-4 text-slate-400"></i> ${escapeHtml(r.category)}</div>
          ${showOwner ? `<div><i class="fas fa-user w-4 text-slate-400"></i> ${escapeHtml(r.owner_name || '')}</div>` : ''}
          <div><i class="fas fa-clock w-4 text-slate-400"></i> ${formatDate(r.created_at)}</div>
        </div>
        <button onclick="viewReport(${r.id})" class="mt-3 text-sm text-primary-600 font-medium hover:underline text-left">
          View details →
        </button>
      </div>
    </div>
  `;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

async function viewReport(id) {
  try {
    const { report } = await api(`/reports/${id}`);
    let matchesHtml = '';
    try {
      const { matches } = await api(`/reports/${id}/matches`);
      if (matches && matches.length) {
        matchesHtml = `
          <div class="mt-6">
            <h4 class="font-semibold mb-3 flex items-center gap-2"><i class="fas fa-magic text-primary-500"></i> AI Suggested Matches</h4>
            <div class="space-y-3">
              ${matches.map(m => `
                <div class="border border-slate-200 rounded-xl p-3 flex gap-3">
                  ${m.photo_path ? `<img src="${m.photo_path}" class="w-16 h-16 object-cover rounded-lg" />` : '<div class="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center text-slate-300"><i class="fas fa-image"></i></div>'}
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <span class="badge ${badgeType(m.type)}">${m.type}</span>
                      <span class="text-sm font-medium ${scoreColor(m.similarity_score)}">${(m.similarity_score * 100).toFixed(0)}% match</span>
                    </div>
                    <p class="font-medium text-sm truncate">${escapeHtml(m.title)}</p>
                    <p class="text-xs text-slate-500 truncate">${escapeHtml(m.location)} • ${escapeHtml(m.owner_name)}</p>
                    <div class="score-bar mt-1.5"><div class="score-fill" style="width:${m.similarity_score * 100}%"></div></div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }
    } catch {}

    const canUpdate = currentUser && (currentUser.id === report.user_id || currentUser.is_admin);
    showModal(report.title, `
      <div class="space-y-4">
        ${report.photo_path ? `<img src="${report.photo_path}" class="w-full max-h-64 object-contain rounded-xl bg-slate-50" />` : ''}
        <div class="flex flex-wrap gap-2">
          <span class="badge ${badgeType(report.type)}">${report.type.toUpperCase()}</span>
          <span class="badge ${badgeStatus(report.status)}">${report.status}</span>
          <span class="badge bg-slate-100 text-slate-700">${escapeHtml(report.category)}</span>
        </div>
        <p class="text-slate-700">${escapeHtml(report.description)}</p>
        <div class="grid grid-cols-2 gap-3 text-sm">
          <div><span class="text-slate-500">Location</span><br><strong>${escapeHtml(report.location)}</strong></div>
          <div><span class="text-slate-500">Reported by</span><br><strong>${escapeHtml(report.owner_name)}</strong></div>
          <div><span class="text-slate-500">Date</span><br><strong>${formatDate(report.created_at)}</strong></div>
        </div>
        ${canUpdate ? `
          <div class="pt-4 border-t">
            <label class="label">Update Status</label>
            <div class="flex gap-2">
              <select id="status-select" class="input flex-1">
                <option value="Open" ${report.status==='Open'?'selected':''}>Open</option>
                <option value="Matched" ${report.status==='Matched'?'selected':''}>Matched</option>
                <option value="Returned" ${report.status==='Returned'?'selected':''}>Returned</option>
              </select>
              <button onclick="updateStatus(${report.id})" class="btn-primary">Update</button>
            </div>
          </div>
        ` : ''}
        ${matchesHtml}
      </div>
    `);
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function updateStatus(id) {
  const status = document.getElementById('status-select').value;
  try {
    await api(`/reports/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
    toast('Status updated');
    closeModal();
    if (currentPage === 'my-reports') showPage('my-reports');
    else if (currentPage === 'admin') showPage('admin');
    else loadBrowse();
  } catch (err) {
    toast(err.message, 'error');
  }
}

// ---------- MY REPORTS ----------
async function renderMyReports() {
  if (!currentUser) {
    showPage('login');
    return '';
  }
  const { reports } = await api('/reports/my');
  if (reports.length === 0) {
    return `
      <div class="text-center py-20">
        <i class="fas fa-clipboard-list text-5xl text-slate-300 mb-4"></i>
        <h2 class="text-xl font-semibold mb-2">No reports yet</h2>
        <p class="text-slate-500 mb-6">Report a lost or found item to get started.</p>
        <button onclick="showPage('report')" class="btn-primary">Report an Item</button>
      </div>
    `;
  }
  return `
    <div>
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold">My Reports</h2>
        <button onclick="showPage('report')" class="btn-primary text-sm"><i class="fas fa-plus mr-1"></i> New</button>
      </div>
      <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        ${reports.map(r => reportCard({ ...r, owner_name: currentUser.name }, false)).join('')}
      </div>
    </div>
  `;
}

// ---------- ADMIN ----------
async function renderAdmin() {
  if (!currentUser || !currentUser.is_admin) {
    return '<div class="text-center py-20 text-red-600">Admin access required.</div>';
  }
  const stats = await api('/admin/stats');
  const { reports } = await api('/admin/reports');

  return `
    <div>
      <h2 class="text-2xl font-bold mb-6">Admin Dashboard</h2>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div class="card p-4 text-center">
          <div class="text-2xl font-bold text-primary-600">${stats.totalReports}</div>
          <div class="text-xs text-slate-500 mt-1">Total Reports</div>
        </div>
        <div class="card p-4 text-center">
          <div class="text-2xl font-bold text-blue-600">${stats.openReports}</div>
          <div class="text-xs text-slate-500 mt-1">Open</div>
        </div>
        <div class="card p-4 text-center">
          <div class="text-2xl font-bold text-amber-600">${stats.matched}</div>
          <div class="text-xs text-slate-500 mt-1">Matched</div>
        </div>
        <div class="card p-4 text-center">
          <div class="text-2xl font-bold text-emerald-600">${stats.returned}</div>
          <div class="text-xs text-slate-500 mt-1">Returned</div>
        </div>
      </div>

      <div class="card overflow-hidden">
        <div class="px-5 py-4 border-b flex justify-between items-center">
          <h3 class="font-semibold">All Reports</h3>
          <span class="text-sm text-slate-500">${reports.length} shown</span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-slate-50 text-slate-600">
              <tr>
                <th class="text-left px-4 py-3 font-medium">Item</th>
                <th class="text-left px-4 py-3 font-medium">Type</th>
                <th class="text-left px-4 py-3 font-medium">Status</th>
                <th class="text-left px-4 py-3 font-medium">Owner</th>
                <th class="text-left px-4 py-3 font-medium">Date</th>
                <th class="text-left px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${reports.map(r => `
                <tr class="hover:bg-slate-50">
                  <td class="px-4 py-3">
                    <div class="font-medium truncate max-w-[180px]">${escapeHtml(r.title)}</div>
                    <div class="text-xs text-slate-500">${escapeHtml(r.category)}</div>
                  </td>
                  <td class="px-4 py-3"><span class="badge ${badgeType(r.type)}">${r.type}</span></td>
                  <td class="px-4 py-3"><span class="badge ${badgeStatus(r.status)}">${r.status}</span></td>
                  <td class="px-4 py-3 text-xs">${escapeHtml(r.owner_name)}<br><span class="text-slate-400">${escapeHtml(r.owner_email)}</span></td>
                  <td class="px-4 py-3 text-xs text-slate-500">${formatDate(r.created_at)}</td>
                  <td class="px-4 py-3">
                    <button onclick="viewReport(${r.id})" class="text-primary-600 hover:underline text-xs mr-2">View</button>
                    <button onclick="adminDelete(${r.id})" class="text-red-600 hover:underline text-xs">Delete</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

async function adminDelete(id) {
  if (!confirm('Delete this report permanently?')) return;
  try {
    await api(`/admin/reports/${id}`, { method: 'DELETE' });
    toast('Report deleted');
    showPage('admin');
  } catch (err) {
    toast(err.message, 'error');
  }
}

// ---------- Form Handlers (event delegation) ----------
document.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;

  if (form.id === 'login-form') {
    const fd = new FormData(form);
    try {
      const data = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: fd.get('email'), password: fd.get('password') })
      });
      setAuth(data.token, data.user);
      toast('Welcome back, ' + data.user.name);
      showPage('home');
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  if (form.id === 'register-form') {
    const fd = new FormData(form);
    try {
      const data = await api('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          register_no: fd.get('register_no'),
          email: fd.get('email'),
          password: fd.get('password')
        })
      });
      sessionStorage.setItem('pendingEmail', fd.get('email'));
      const msg = data.studentName
        ? `Registered as ${data.studentName} (Roll ${data.rollNo}). ` + data.message
        : data.message;
      toast(msg + (data.demoVerificationCode ? ` Code: ${data.demoVerificationCode}` : ''));
      showPage('verify');
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  if (form.id === 'verify-form') {
    const fd = new FormData(form);
    try {
      const data = await api('/auth/verify', {
        method: 'POST',
        body: JSON.stringify({ email: fd.get('email'), code: fd.get('code') })
      });
      setAuth(data.token, data.user);
      toast('Email verified! You are logged in.');
      showPage('home');
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  if (form.id === 'forgot-form') {
    const fd = new FormData(form);
    try {
      const data = await api('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: fd.get('email') })
      });
      sessionStorage.setItem('resetEmail', fd.get('email'));
      toast(data.message + (data.demoResetCode ? ` Code: ${data.demoResetCode}` : ''));
      showPage('reset');
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  if (form.id === 'reset-form') {
    const fd = new FormData(form);
    try {
      await api('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          email: fd.get('email'),
          code: fd.get('code'),
          newPassword: fd.get('newPassword')
        })
      });
      toast('Password reset successful. Please login.');
      showPage('login');
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  if (form.id === 'report-form') {
    const fd = new FormData(form);
    try {
      const data = await api('/reports', { method: 'POST', body: fd });
      toast('Report submitted successfully!');
      // Show matches if any
      if (data.suggestedMatches && data.suggestedMatches.length) {
        setTimeout(() => {
          showModal('AI Found Possible Matches!', `
            <p class="text-sm text-slate-600 mb-4">Based on title, description and location similarity:</p>
            <div class="space-y-3">
              ${data.suggestedMatches.map(m => `
                <div class="border rounded-xl p-3">
                  <div class="flex justify-between items-start">
                    <div>
                      <span class="badge ${badgeType(m.type)}">${m.type}</span>
                      <p class="font-medium mt-1">${escapeHtml(m.title)}</p>
                      <p class="text-xs text-slate-500">${escapeHtml(m.location)}</p>
                    </div>
                    <span class="text-sm font-bold ${scoreColor(m.similarity_score)}">${(m.similarity_score*100).toFixed(0)}%</span>
                  </div>
                  <div class="score-bar mt-2"><div class="score-fill" style="width:${m.similarity_score*100}%"></div></div>
                </div>
              `).join('')}
            </div>
            <button onclick="closeModal(); showPage('my-reports')" class="btn-primary w-full mt-5">Go to My Reports</button>
          `);
        }, 400);
      } else {
        showPage('my-reports');
      }
    } catch (err) {
      toast(err.message, 'error');
    }
  }
});

// ---------- Init ----------
(function init() {
  const saved = localStorage.getItem('user');
  if (saved && getToken()) {
    try {
      currentUser = JSON.parse(saved);
    } catch {}
  }
  updateNavbar();
  showPage('home');

  // Close modal on backdrop click
  document.getElementById('modal').addEventListener('click', (e) => {
    if (e.target.id === 'modal') closeModal();
  });
})();
