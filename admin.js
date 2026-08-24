const TOKEN_KEY = 'sly-admin-token';

const state = {
  token: localStorage.getItem(TOKEN_KEY) || '',
  products: [],
  orders: [],
  chart: [],
};

const money = (value) => `${new Intl.NumberFormat('fr-FR').format(value)} FCFA`;
const toast = document.querySelector('#toast');
const authCard = document.querySelector('#auth-card');
const dashboardPanel = document.querySelector('#dashboard-panel');
const productDrawer = document.querySelector('#product-drawer');
const sidebarLinks = document.querySelectorAll('.sidebar-nav a[data-view]');
const viewPanels = document.querySelectorAll('[data-view-panel]');

function showToast(text) {
  toast.textContent = text;
  toast.classList.add('show');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2200);
}

function setToken(token) {
  state.token = token;
  localStorage.setItem(TOKEN_KEY, token);
}

function clearToken() {
  state.token = '';
  localStorage.removeItem(TOKEN_KEY);
}

function showDashboard() {
  authCard.classList.add('hidden');
  dashboardPanel.classList.remove('hidden');
}

function showLogin() {
  authCard.classList.remove('hidden');
  dashboardPanel.classList.add('hidden');
}

function setActiveView(view) {
  viewPanels.forEach((panel) => {
    panel.classList.toggle('active-view', panel.dataset.viewPanel === view);
  });
  sidebarLinks.forEach((link) => {
    link.classList.toggle('active', link.dataset.view === view);
  });
  const title = document.querySelector('.admin-topbar h2');
  const titles = {
    dashboard: 'Tableau de bord', orders: 'Commandes', products: 'Produits', clients: 'Clients',
    analytics: 'Analytique', notifications: 'Notifications', settings: 'Paramètres',
  };
  title.textContent = titles[view] || titles.dashboard;
}

function authHeaders() {
  return state.token ? { Authorization: `Bearer ${state.token}` } : {};
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...authHeaders(),
    },
  });

  if (response.status === 401) {
    clearToken();
    showLogin();
    throw new Error('Session expirée');
  }

  return response;
}

function formatDate(value) {
  return new Date(value).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStats() {
  const validatedOrders = state.orders.filter((order) => order.status === 'validated');
  const revenue = validatedOrders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
  const totalOrders = validatedOrders.length;
  const clients = new Set(validatedOrders.map((order) => order.customer_phone)).size;
  const lowStock = state.products.filter((product) => Number(product.stock || 0) <= 5).length;
  const pendingOrders = state.orders.filter((order) => order.status === 'pending').length;

  return { revenue, totalOrders, clients, lowStock, pendingOrders };
}

function getStockClass(stock) {
  if (stock <= 5) return 'danger';
  if (stock <= 10) return 'warning';
  return 'ok';
}

function renderStats() {
  const stats = getStats();
  document.querySelector('#revenue-stat').textContent = money(stats.revenue);
  document.querySelector('#revenue-sub').textContent = `${stats.totalOrders} commandes validées`;
  document.querySelector('#orders-stat').textContent = stats.totalOrders;
  document.querySelector('#orders-sub').textContent = `${stats.pendingOrders} en attente de traitement`;
  document.querySelector('#clients-stat').textContent = stats.clients;
  document.querySelector('#products-stat').textContent = state.products.length;
  document.querySelector('#stock-warning').textContent = `${stats.lowStock} produits en stock bas`;
}

function renderChart() {
  const charts = [document.querySelector('#sales-chart'), document.querySelector('#sales-chart-detail')].filter(Boolean);
  const labels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return date.toISOString().slice(0, 10);
  });

  const totals = days.map((day) =>
    state.orders
    .filter((order) => order.status === 'validated' && new Date(order.created_at).toISOString().slice(0, 10) === day)
      .reduce((sum, order) => sum + Number(order.total_amount || 0), 0),
  );

  const maxValue = Math.max(...totals, 1);

  const markup = labels
    .map((label, index) => {
      const value = totals[index];
      const height = Math.max(18, Math.round((value / maxValue) * 150));
      return `
        <div class="bar-column">
          <span class="bar-value">${value ? Math.round(value / 1000) + 'k' : '0'}</span>
          <div class="bar" style="height:${height}px"></div>
          <span class="bar-label">${label}</span>
        </div>`;
    })
    .join('');
  charts.forEach((chart) => { chart.innerHTML = markup; });
}

function renderOrders() {
  const lists = [document.querySelector('#dashboard-orders-list'), document.querySelector('#orders-list')].filter(Boolean);
  if (!state.orders.length) {
    lists.forEach((list) => { list.innerHTML = '<div class="empty-state">Aucune commande pour le moment</div>'; });
    return;
  }

  const statusLabels = { pending: 'En attente', validated: 'Validée', cancelled: 'Annulée' };
  const markup = state.orders
    .map(
      (order) => `
        <article class="order-row">
          <div>
            <strong>${order.customer_name}</strong>
            <span>${order.customer_phone}</span>
          </div>
          <div>
            <strong>${money(order.total_amount)}</strong>
            <span>${order.delivery_mode}</span>
          </div>
          <div><span class="status-pill ${order.status === 'pending' ? 'pending' : order.status === 'cancelled' ? 'danger' : 'done'}">${statusLabels[order.status] || order.status}</span><span>${formatDate(order.created_at)}</span></div>
          <div class="order-actions"><button class="order-action validate-order" data-id="${order.id}" type="button">Valider</button><button class="order-action cancel-order" data-id="${order.id}" type="button">Annuler</button><button class="order-action delete-order" data-id="${order.id}" type="button">Supprimer</button></div>
        </article>`,
    ).join('');
  lists.forEach((list) => {
    list.innerHTML = list.id === 'dashboard-orders-list'
      ? state.orders.slice(0, 5).map((order) => `
        <article class="order-row">
          <div><strong>${order.customer_name}</strong><span>${order.customer_phone}</span></div>
          <div><strong>${money(order.total_amount)}</strong><span>${order.delivery_mode}</span></div>
          <div><span class="status-pill ${order.status === 'pending' ? 'pending' : order.status === 'cancelled' ? 'danger' : 'done'}">${statusLabels[order.status] || order.status}</span><span>${formatDate(order.created_at)}</span></div>
        </article>`).join('')
      : markup;
  });
  document.querySelectorAll('.validate-order').forEach((button) => button.addEventListener('click', () => updateOrderStatus(Number(button.dataset.id), 'validated')));
  document.querySelectorAll('.cancel-order').forEach((button) => button.addEventListener('click', () => updateOrderStatus(Number(button.dataset.id), 'cancelled')));
  document.querySelectorAll('.delete-order').forEach((button) => button.addEventListener('click', () => deleteOrder(Number(button.dataset.id))));
}

async function updateOrderStatus(id, status) {
  const response = await api(`/api/admin/orders/${id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
  if (!response.ok) { showToast('Modification impossible'); return; }
  showToast(status === 'validated' ? 'Commande validée' : 'Commande annulée');
  await loadOrders();
}

async function deleteOrder(id) {
  if (!window.confirm('Supprimer définitivement cette commande ?')) return;
  const response = await api(`/api/admin/orders/${id}`, { method: 'DELETE' });
  if (!response.ok && response.status !== 204) { showToast('Suppression impossible'); return; }
  showToast('Commande supprimée');
  await loadOrders();
}

function renderProducts() {
  const list = document.querySelector('#admin-list');
  if (!state.products.length) {
    list.innerHTML = '<div class="empty-state">Aucun produit pour le moment</div>';
    return;
  }

  list.innerHTML = `
    <div class="product-head">
      <span>Produit</span>
      <span>Stock</span>
      <span>Prix</span>
      <span>Statut</span>
      <span></span>
    </div>
    ${state.products
      .map((product) => {
        const stock = Number(product.stock || 0);
        const status = stock <= 5 ? 'Stock bas' : 'OK';
        const badgeClass = stock <= 5 ? 'danger' : 'ok';
        const maxStock = Math.max(stock, 1);
        const progress = Math.min(100, Math.round((stock / maxStock) * 100));

        return `
          <article class="product-row">
            <div class="product-cell product-main">
              <img src="${product.image_url}" alt="${product.name}" />
              <div>
                <strong>${product.name}</strong>
                <span>${product.category.toUpperCase()}</span>
              </div>
            </div>
            <div class="product-cell">
              <div class="stock-wrap">
                <span>${stock} unité${stock > 1 ? 's' : ''}</span>
                <div class="stock-track"><i style="width:${progress}%"></i></div>
              </div>
            </div>
            <div class="product-cell">
              <strong>${money(product.price)}</strong>
            </div>
            <div class="product-cell">
              <span class="status-pill ${badgeClass}">${status}</span>
            </div>
            <div class="product-cell product-actions">
              <button class="inline-link delete-product" data-id="${product.id}" type="button">Supprimer</button>
            </div>
          </article>`;
      })
      .join('')}
  `;

  document.querySelectorAll('.delete-product').forEach((button) => {
    button.addEventListener('click', async () => {
      const id = Number(button.dataset.id);
      if (!window.confirm('Supprimer ce produit ?')) {
        return;
      }

      const response = await api(`/api/admin/products/${id}`, { method: 'DELETE' });
      if (!response.ok && response.status !== 204) {
        showToast('Suppression impossible');
        return;
      }

      showToast('Produit supprimé');
      await loadProducts();
    });
  });
}

function renderClients() {
  const list = document.querySelector('#clients-list');
  const clients = new Map();

  state.orders.forEach((order) => {
    const key = order.customer_phone;
    if (!clients.has(key)) {
      clients.set(key, {
        name: order.customer_name,
        phone: order.customer_phone,
        count: 0,
        lastOrder: order.created_at,
      });
    }

    const entry = clients.get(key);
    entry.count += 1;
    if (new Date(order.created_at) > new Date(entry.lastOrder)) {
      entry.lastOrder = order.created_at;
    }
  });

  const items = Array.from(clients.values()).slice(0, 5);
  if (!items.length) {
    list.innerHTML = '<div class="empty-state">Aucun client enregistré</div>';
    return;
  }

  list.innerHTML = items
    .map(
      (client) => `
        <div class="client-row">
          <div class="client-avatar">${client.name
            .split(' ')
            .map((part) => part[0] || '')
            .join('')
            .slice(0, 2)
            .toUpperCase()}</div>
          <div class="client-meta">
            <strong>${client.name}</strong>
            <span>${client.phone}</span>
          </div>
          <div class="client-meta right">
            <strong>${client.count} commande${client.count > 1 ? 's' : ''}</strong>
            <span>${formatDate(client.lastOrder)}</span>
          </div>
        </div>`,
    )
    .join('');
}

function fillDrawerDefaults() {
  const form = document.querySelector('#product-form');
  form.reset();
  form.querySelector('[name="category"]').value = 'iPhone';
}

function openDrawer() {
  productDrawer.classList.add('open');
  productDrawer.setAttribute('aria-hidden', 'false');
}

function closeDrawer() {
  productDrawer.classList.remove('open');
  productDrawer.setAttribute('aria-hidden', 'true');
}

async function loadProducts() {
  const response = await api('/api/admin/products');
  if (!response.ok) {
    showToast('Impossible de charger les produits');
    return;
  }
  state.products = await response.json();
  renderProducts();
  renderStats();
}

async function loadOrders() {
  const response = await api('/api/admin/orders');
  if (!response.ok) {
    showToast('Impossible de charger les commandes');
    return;
  }
  state.orders = await response.json();
  renderOrders();
  renderClients();
  renderChart();
  renderStats();
}

async function refreshDashboard() {
  await Promise.all([loadProducts(), loadOrders()]);
  showToast('Synchronisation terminée');
}

async function handleLogin(event) {
  event.preventDefault();
  const password = document.querySelector('#admin-password').value;

  const response = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });

  if (!response.ok) {
    showToast('Mot de passe incorrect');
    return;
  }

  const data = await response.json();
  setToken(data.token);
  showDashboard();
  await refreshDashboard();
  showToast('Connexion réussie');
}

async function handleAddProduct(event) {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
  const isPromotion = payload.promotion === 'true';
  delete payload.promotion;
  payload.tag = isPromotion ? `Promo${payload.tag ? ` · ${payload.tag}` : ''}` : (payload.tag || 'Disponible');

  const response = await api('/api/admin/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    showToast(error.error || 'Ajout impossible');
    return;
  }

  fillDrawerDefaults();
  closeDrawer();
  showToast('Produit ajouté');
  await loadProducts();
}

document.querySelector('#login-form').addEventListener('submit', handleLogin);
document.querySelector('#product-form').addEventListener('submit', handleAddProduct);
document.querySelector('#open-product-drawer').addEventListener('click', openDrawer);
document.querySelector('#close-product-drawer').addEventListener('click', closeDrawer);
document.querySelector('#close-product-drawer-button').addEventListener('click', closeDrawer);
document.querySelector('#refresh-all').addEventListener('click', refreshDashboard);
document.querySelector('#refresh-orders').addEventListener('click', loadOrders);
document.querySelector('#open-product-drawer-view').addEventListener('click', openDrawer);
sidebarLinks.forEach((link) => link.addEventListener('click', (event) => {
  event.preventDefault();
  setActiveView(link.dataset.view);
  window.history.replaceState(null, '', link.getAttribute('href'));
}));
document.querySelector('#logout-button').addEventListener('click', () => {
  clearToken();
  showLogin();
  showToast('Déconnecté');
});

if (state.token) {
  showDashboard();
  const initialView = [...sidebarLinks].find((link) => link.getAttribute('href') === window.location.hash)?.dataset.view || 'dashboard';
  setActiveView(initialView);
  refreshDashboard().catch(() => {
    clearToken();
    showLogin();
  });
} else {
  showLogin();
}
