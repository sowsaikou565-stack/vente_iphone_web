const STORE_NAME = 'SLY MOBILE';
const WHATSAPP_NUMBER = '22962329541';
const CART_KEY = 'sly-cart';
const API_BASE_URL = 'https://sly-mobile-backend.onrender.com';

let products = [];
let cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
let selectedCategory = 'Tous';
let deliveryMode = 'Livraison';
let pendingOrderItems = null;

const money = (value) => `${new Intl.NumberFormat('fr-FR').format(value)} FCFA`;
const grid = document.querySelector('#product-grid');
const promoGrid = document.querySelector('#promo-grid');
const categoryLinks = document.querySelector('#category-links');
const deliveryOptions = document.querySelectorAll('.delivery-option');
const addressField = document.querySelector('#address-field');
const addressInput = document.querySelector('#customer-address');
const authScreen = document.querySelector('#customer-auth');
const authForm = document.querySelector('#customer-auth-form');
const AUTH_TOKEN_KEY = 'sly-customer-token';
const THEME_KEY = 'sly-theme';
let authMode = 'register';

function findProduct(id) {
  return products.find((product) => product.id === id);
}

function getActiveOrderItems() {
  return pendingOrderItems ?? cart;
}

function getOrderTotal(items) {
  return items.reduce((sum, item) => {
    const product = findProduct(item.id);
    return sum + product.price * item.qty;
  }, 0);
}

function setDeliveryMode(mode) {
  deliveryMode = mode;
  deliveryOptions.forEach((button) => {
    button.classList.toggle('selected', button.dataset.delivery === mode);
  });
  addressField.style.display = mode === 'Livraison' ? 'block' : 'none';
  addressInput.required = mode === 'Livraison';
}

function toggleDrawer(open) {
  const drawer = document.querySelector('#cart-drawer');
  drawer.classList.toggle('open', open);
  drawer.setAttribute('aria-hidden', String(!open));
}

function toggleModal(open) {
  const modal = document.querySelector('#order-modal');
  modal.classList.toggle('open', open);
  modal.setAttribute('aria-hidden', String(!open));
  if (open) {
    setDeliveryMode(deliveryMode);
  } else {
    pendingOrderItems = null;
  }
}

function showToast(text) {
  const toast = document.querySelector('#toast');
  toast.textContent = text;
  toast.classList.add('show');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2200);
}

function setAuthMode(mode) {
  authMode = mode;
  const register = mode === 'register';
  document.querySelector('#auth-title').innerHTML = register ? 'Votre boutique,<br /><em>en toute simplicité.</em>' : 'Ravi de vous<br /><em>retrouver.</em>';
  document.querySelector('#auth-description').textContent = register ? 'Créez votre compte pour découvrir nos iPhones et accessoires à Cotonou.' : 'Connectez-vous pour accéder à la boutique SLY MOBILE.';
  document.querySelector('#auth-name-field').style.display = register ? 'block' : 'none';
  document.querySelector('#auth-phone-field').style.display = register ? 'block' : 'none';
  document.querySelector('#auth-name').required = register;
  document.querySelector('#auth-phone').required = register;
  document.querySelector('#auth-identifier').type = register ? 'email' : 'text';
  document.querySelector('#auth-identifier').placeholder = register ? 'votre@email.com' : 'Email ou téléphone';
  document.querySelector('#auth-submit').innerHTML = register ? 'Créer mon compte <span>↗</span>' : 'Se connecter <span>↗</span>';
  document.querySelector('#auth-switch-text').textContent = register ? 'Vous avez déjà un compte ?' : 'Pas encore de compte ?';
  document.querySelector('#auth-switch').textContent = register ? 'Se connecter' : 'Créer un compte';
}

function unlockCustomer() { authScreen.classList.add('hidden'); document.body.classList.remove('auth-locked'); }

function applyTheme(theme) {
  document.body.classList.toggle('dark-theme', theme === 'dark');
  document.querySelector('#theme-toggle').textContent = theme === 'dark' ? '☀' : '☾';
  localStorage.setItem(THEME_KEY, theme);
}

function showCustomerAuth() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  authScreen.classList.remove('hidden');
  document.body.classList.add('auth-locked');
  setAuthMode('login');
}

async function handleCustomerAuth(event) {
  event.preventDefault();
  const error = document.querySelector('#auth-error');
  error.textContent = '';
  const register = authMode === 'register';
  const payload = register
    ? { name: document.querySelector('#auth-name').value, phone: document.querySelector('#auth-phone').value, email: document.querySelector('#auth-identifier').value, password: document.querySelector('#auth-password').value }
    : { identifier: document.querySelector('#auth-identifier').value, password: document.querySelector('#auth-password').value };
  const response = await fetch(`${API_BASE_URL}${register ? '/api/customer/register' : '/api/customer/login'}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) { error.textContent = data.error || 'Une erreur est survenue'; return; }
  localStorage.setItem(AUTH_TOKEN_KEY, data.token);
  unlockCustomer();
  loadProducts().catch(() => showToast('Impossible de charger la boutique'));
}

function saveCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  renderCart();
}

function addToCart(id) {
  const item = cart.find((entry) => entry.id === id);
  if (item) {
    item.qty += 1;
  } else {
    cart.push({ id, qty: 1 });
  }
  saveCart();
  showToast('Produit ajouté au panier');
}

function startQuickOrder(id) {
  pendingOrderItems = [{ id, qty: 1 }];
  setDeliveryMode('Livraison');
  toggleModal(true);
}

function renderCategoryFilters() {
  const categories = ['Tous', ...new Set(products.map((product) => product.category)), 'Promotions'];
  categoryLinks.innerHTML = categories
    .map(
      (category, index) =>
        `<button class="category ${index === 0 ? 'active' : ''}" data-category="${category}" type="button">${category}${
          category === 'Tous' ? ' <span>↗</span>' : ''
        }</button>`,
    )
    .join('');

  document.querySelectorAll('.category').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.category').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      selectedCategory = button.dataset.category;
      renderProducts();
    });
  });
}

function renderProducts() {
  const query = document.querySelector('#search').value.toLowerCase();
  const sort = document.querySelector('#sort').value;

  let list = products.filter((product) => {
    const isPromotion = String(product.tag || '').toLowerCase().includes('promo');
    const matchesCategory =
      selectedCategory === 'Tous' ||
      (selectedCategory === 'Promotions' ? isPromotion : product.category === selectedCategory);
    const matchesQuery = `${product.name} ${product.detail}`.toLowerCase().includes(query);
    return matchesCategory && matchesQuery;
  });

  if (sort === 'price-low') {
    list.sort((a, b) => a.price - b.price);
  }

  if (sort === 'price-high') {
    list.sort((a, b) => b.price - a.price);
  }

  grid.innerHTML =
    list
      .map(
        (product) => `
          <article class="product-card">
            <div class="product-image">
              <img src="${product.image_url}" alt="${product.name}" loading="lazy" />
              <span class="product-tag">${product.tag}</span>
            </div>
            <div class="product-content">
              <p>${product.category} · ${product.detail}</p>
              <h3>${product.name}</h3>
              <div class="price-row">
                <span class="price">${money(product.price)}</span>
              </div>
              <div class="product-actions">
                <button class="add-product" data-id="${product.id}" type="button">Ajouter</button>
                <button class="order-product" data-id="${product.id}" type="button">Commander</button>
              </div>
            </div>
          </article>`,
      )
      .join('') || '<p class="empty-results">Aucun produit ne correspond à votre recherche.</p>';

  document.querySelectorAll('.add-product').forEach((button) => {
    button.addEventListener('click', () => addToCart(Number(button.dataset.id)));
  });

  document.querySelectorAll('.order-product').forEach((button) => {
    button.addEventListener('click', () => startQuickOrder(Number(button.dataset.id)));
  });
}

function renderPromotions() {
  if (!promoGrid) {
    return;
  }

  const promoProducts = products.filter((product) =>
    String(product.tag || '').toLowerCase().includes('promo'),
  );

  if (!promoProducts.length) {
    promoGrid.innerHTML =
      '<p class="empty-results">Aucun produit en promotion pour le moment.</p>';
    return;
  }

  promoGrid.innerHTML = promoProducts
    .slice(0, 3)
    .map(
      (product) => `
        <article class="promo-card">
          <div class="promo-image">
            <img src="${product.image_url}" alt="${product.name}" loading="lazy" />
            <span class="promo-badge">Promo</span>
          </div>
          <div class="promo-content">
            <p>${product.category} · ${product.tag}</p>
            <h3>${product.name}</h3>
            <div class="promo-price">
              <strong>${money(product.price)}</strong>
            </div>
            <div class="product-actions">
              <button class="add-product" data-id="${product.id}" type="button">Ajouter</button>
              <button class="order-product" data-id="${product.id}" type="button">Commander</button>
            </div>
          </div>
        </article>`,
    )
    .join('');

  document.querySelectorAll('.promo-card .add-product').forEach((button) => {
    button.addEventListener('click', () => addToCart(Number(button.dataset.id)));
  });

  document.querySelectorAll('.promo-card .order-product').forEach((button) => {
    button.addEventListener('click', () => startQuickOrder(Number(button.dataset.id)));
  });
}

function renderCart() {
  const count = cart.reduce((sum, item) => sum + item.qty, 0);
  const total = getOrderTotal(cart);
  const items = document.querySelector('#cart-items');
  const empty = document.querySelector('#cart-empty');
  const footer = document.querySelector('#cart-footer');

  document.querySelector('#cart-count').textContent = count;
  document.querySelector('#drawer-count').textContent = count;
  document.querySelector('#cart-total').textContent = money(total);

  items.innerHTML = cart
    .map((item) => {
      const product = findProduct(item.id);
      return `
        <div class="cart-item">
          <img src="${product.image_url}" alt="${product.name}" />
          <div class="cart-item-info">
            <h3>${product.name}</h3>
            <p>${item.qty} x ${money(product.price)}</p>
          </div>
          <button class="cart-remove" data-id="${product.id}" type="button">Supprimer</button>
        </div>`;
    })
    .join('');

  empty.classList.toggle('visible', !cart.length);
  footer.classList.toggle('hidden', !cart.length);

  document.querySelectorAll('.cart-remove').forEach((button) => {
    button.addEventListener('click', () => {
      cart = cart.filter((item) => item.id !== Number(button.dataset.id));
      saveCart();
    });
  });
}

async function loadProducts() {
  const response = await fetch(`${API_BASE_URL}/api/products`);
  if (!response.ok) {
    throw new Error('Impossible de charger les produits');
  }
  products = await response.json();
  renderCategoryFilters();
  renderProducts();
  renderPromotions();
  renderCart();
}

async function submitOrder(event) {
  event.preventDefault();

  const items = getActiveOrderItems();
  if (!items.length) {
    showToast('Ajoutez un article avant de commander');
    return;
  }

  const customerName = document.querySelector('#customer-name').value.trim();
  const customerPhone = document.querySelector('#customer-phone').value.trim();
  const address = document.querySelector('#customer-address').value.trim();

  if (deliveryMode === 'Livraison' && !address) {
    showToast('Ajoutez votre adresse de livraison');
    return;
  }

  const response = await fetch(`${API_BASE_URL}/api/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      customerName,
      customerPhone,
      deliveryMode,
      address,
      items,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    showToast(error.error || 'Impossible d’enregistrer la commande');
    return;
  }

  const data = await response.json();
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(data.whatsappMessage)}`;

  window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  toggleModal(false);
  showToast(`Commande #${data.orderId} enregistrée`);
}

document.querySelector('#auth-switch').addEventListener('click', () => setAuthMode(authMode === 'register' ? 'login' : 'register'));
authForm.addEventListener('submit', handleCustomerAuth);
document.querySelector('#search').addEventListener('input', renderProducts);
document.querySelector('#sort').addEventListener('change', renderProducts);
document.querySelector('#open-cart').addEventListener('click', () => toggleDrawer(true));
document.querySelector('#customer-account').addEventListener('click', showCustomerAuth);
document.querySelector('#theme-toggle').addEventListener('click', () => applyTheme(document.body.classList.contains('dark-theme') ? 'light' : 'dark'));
document.querySelector('#close-cart').addEventListener('click', () => toggleDrawer(false));
document.querySelector('#close-cart-button').addEventListener('click', () => toggleDrawer(false));
document.querySelector('#browse-products').addEventListener('click', () => toggleDrawer(false));
document.querySelector('#checkout').addEventListener('click', () => {
  if (!cart.length) {
    showToast('Ajoutez au moins un produit');
    return;
  }
  pendingOrderItems = null;
  setDeliveryMode('Livraison');
  toggleDrawer(false);
  toggleModal(true);
});
document.querySelector('#close-modal').addEventListener('click', () => toggleModal(false));
document.querySelector('#close-modal-button').addEventListener('click', () => toggleModal(false));
deliveryOptions.forEach((button) => {
  button.addEventListener('click', () => setDeliveryMode(button.dataset.delivery));
});
document.querySelector('#order-form').addEventListener('submit', submitOrder);

const customerToken = localStorage.getItem(AUTH_TOKEN_KEY);
if (customerToken) {
  fetch(`${API_BASE_URL}/api/customer/me`, { headers: { Authorization: `Bearer ${customerToken}` } }).then((response) => {
    if (!response.ok) throw new Error('Session expirée');
    unlockCustomer();
    return loadProducts();
  }).catch(() => { localStorage.removeItem(AUTH_TOKEN_KEY); setAuthMode('login'); });
} else {
  document.body.classList.add('auth-locked');
  setAuthMode('register');
}
setDeliveryMode('Livraison');
applyTheme(localStorage.getItem(THEME_KEY) || 'light');
