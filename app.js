const STORE_NAME = 'SLY MOBILE';
const WHATSAPP_NUMBER = '22962329541';
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}`;
const CART_KEY = 'sly-cart';
const PRODUCTS_KEY = 'sly-products';

const DEFAULT_PRODUCTS = [
  {
    id: 1,
    name: 'iPhone 15 Pro',
    category: 'iPhone',
    detail: '256 Go · Titane naturel',
    price: 675000,
    tag: 'Vedette',
    image: 'https://images.unsplash.com/photo-1696446701796-da61225697cc?auto=format&fit=crop&w=700&q=85',
  },
  {
    id: 2,
    name: 'iPhone 13',
    category: 'iPhone',
    detail: '128 Go · Minuit',
    price: 395000,
    tag: 'Disponible',
    image: 'https://images.unsplash.com/photo-1632661674596-df8be070a5c5?auto=format&fit=crop&w=700&q=85',
  },
  {
    id: 3,
    name: 'Coque silicone',
    category: 'Accessoires',
    detail: 'Protection · Plusieurs couleurs',
    price: 8500,
    tag: 'Nouveau',
    image: 'https://images.unsplash.com/photo-1601593346740-925612772716?auto=format&fit=crop&w=700&q=85',
  },
  {
    id: 4,
    name: 'AirPods Pro',
    category: 'Accessoires',
    detail: '2e génération · USB-C',
    price: 125000,
    tag: 'Populaire',
    image: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=700&q=85',
  },
  {
    id: 5,
    name: 'iPhone 14',
    category: 'iPhone',
    detail: '128 Go · Bleu',
    price: 475000,
    tag: 'Disponible',
    image: 'https://images.unsplash.com/photo-1678652197831-2d180705cd2c?auto=format&fit=crop&w=700&q=85',
  },
  {
    id: 6,
    name: 'Chargeur USB-C',
    category: 'Accessoires',
    detail: '20 W · Charge rapide',
    price: 12000,
    tag: 'Essentiel',
    image: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=700&q=85',
  },
  {
    id: 7,
    name: 'iPhone 15',
    category: 'iPhone',
    detail: '128 Go · Rose',
    price: 550000,
    tag: 'Nouveau',
    image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=700&q=85',
  },
  {
    id: 8,
    name: 'Verre trempé',
    category: 'Accessoires',
    detail: 'Protection écran · HD',
    price: 5000,
    tag: 'Essentiel',
    image: 'https://images.unsplash.com/photo-1567581935884-3349723552ca?auto=format&fit=crop&w=700&q=85',
  },
];

function loadProducts() {
  try {
    const stored = JSON.parse(localStorage.getItem(PRODUCTS_KEY) || 'null');
    return Array.isArray(stored) && stored.length ? stored : [...DEFAULT_PRODUCTS];
  } catch {
    return [...DEFAULT_PRODUCTS];
  }
}

function saveProducts() {
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
}

function nextProductId() {
  return products.reduce((max, product) => Math.max(max, product.id), 0) + 1;
}

function normalizeProduct(formData) {
  return {
    id: nextProductId(),
    name: formData.get('name').trim(),
    category: formData.get('category'),
    detail: formData.get('detail').trim(),
    price: Number(formData.get('price')),
    tag: formData.get('tag').trim(),
    image: formData.get('image').trim(),
  };
}

let products = loadProducts();
let cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
let selectedCategory = 'Tous';
let deliveryMode = 'Livraison';
let pendingOrderItems = null;

const money = (value) => `${new Intl.NumberFormat('fr-FR').format(value)} FCFA`;
const grid = document.querySelector('#product-grid');
const deliveryOptions = document.querySelectorAll('.delivery-option');
const addressField = document.querySelector('#address-field');
const addressInput = document.querySelector('#customer-address');
const adminList = document.querySelector('#admin-list');

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
  showToast.timer = window.setTimeout(() => {
    toast.classList.remove('show');
  }, 2200);
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

function addProduct(product) {
  products = [product, ...products];
  saveProducts();
  renderProducts();
  renderAdmin();
  showToast('Produit ajouté à la boutique');
}

function deleteProduct(id) {
  products = products.filter((product) => product.id !== id);
  cart = cart.filter((item) => item.id !== id);
  saveProducts();
  saveCart();
  renderProducts();
  renderAdmin();
  showToast('Produit supprimé');
}

function resetProducts() {
  products = [...DEFAULT_PRODUCTS];
  saveProducts();
  cart = cart.filter((item) => findProduct(item.id));
  saveCart();
  renderProducts();
  renderCart();
  renderAdmin();
  showToast('Catalogue réinitialisé');
}

function startQuickOrder(id) {
  pendingOrderItems = [{ id, qty: 1 }];
  setDeliveryMode('Livraison');
  toggleModal(true);
}

function renderProducts() {
  const query = document.querySelector('#search').value.toLowerCase();
  const sort = document.querySelector('#sort').value;

  let list = products.filter((product) => {
    const matchesCategory =
      selectedCategory === 'Tous' || product.category === selectedCategory;
    const matchesQuery = `${product.name} ${product.detail}`
      .toLowerCase()
      .includes(query);

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
            <img src="${product.image}" alt="${product.name}" loading="lazy" />
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
          <img src="${product.image}" alt="${product.name}" />
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

function renderAdmin() {
  if (!adminList) {
    return;
  }

  adminList.innerHTML = products
    .map(
      (product) => `
        <article class="admin-item">
          <img src="${product.image}" alt="${product.name}" />
          <div class="admin-item-content">
            <h3>${product.name}</h3>
            <p>${product.category} · ${product.detail}</p>
            <strong>${money(product.price)}</strong>
          </div>
          <button class="admin-delete" data-id="${product.id}" type="button">Supprimer</button>
        </article>`,
    )
    .join('');

  document.querySelectorAll('.admin-delete').forEach((button) => {
    button.addEventListener('click', () => deleteProduct(Number(button.dataset.id)));
  });
}

function buildWhatsAppMessage(items, formData) {
  const lines = items
    .map((item) => {
      const product = findProduct(item.id);
      return `- ${product.name} x${item.qty} (${money(product.price * item.qty)})`;
    })
    .join('\n');

  const total = money(getOrderTotal(items));

  if (formData.deliveryMode === 'Livraison') {
    return [
      `Bonjour, je souhaite commander cet article sur ${STORE_NAME}.`,
      '',
      'Détails de la commande :',
      lines,
      '',
      `Total estimé : ${total}`,
      `Nom : ${formData.name}`,
      `Téléphone : ${formData.phone}`,
      'Mode : Livraison',
      `Adresse : ${formData.address}`,
      '',
      'Merci de me confirmer la disponibilité et le prix de livraison selon mon adresse.',
    ].join('\n');
  }

  return [
    `Bonjour, je souhaite commander cet article sur ${STORE_NAME}.`,
    '',
    'Détails de la commande :',
    lines,
    '',
    `Total estimé : ${total}`,
    `Nom : ${formData.name}`,
    `Téléphone : ${formData.phone}`,
    'Mode : Retrait en boutique',
    '',
    'Je viendrai le récupérer en boutique. Merci de me confirmer la disponibilité.',
  ].join('\n');
}

document.querySelectorAll('.category').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.category').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    selectedCategory = button.dataset.category;
    renderProducts();
  });
});

document.querySelector('#search').addEventListener('input', renderProducts);
document.querySelector('#sort').addEventListener('change', renderProducts);

document.querySelector('#open-cart').addEventListener('click', () => toggleDrawer(true));
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

document.querySelector('#order-form').addEventListener('submit', (event) => {
  event.preventDefault();

  const items = getActiveOrderItems();

  if (!items.length) {
    showToast('Ajoutez un article avant de commander');
    return;
  }

  const formData = {
    name: document.querySelector('#customer-name').value.trim(),
    phone: document.querySelector('#customer-phone').value.trim(),
    address: document.querySelector('#customer-address').value.trim(),
    deliveryMode,
  };

  if (formData.deliveryMode === 'Livraison' && !formData.address) {
    showToast('Ajoutez votre adresse de livraison');
    return;
  }

  const message = buildWhatsAppMessage(items, formData);
  const url = `${WHATSAPP_LINK}?text=${encodeURIComponent(message)}`;

  window.open(url, '_blank', 'noopener,noreferrer');
  toggleModal(false);
  showToast('WhatsApp va s’ouvrir');
});

const productForm = document.querySelector('#product-form');
if (productForm) {
  productForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(productForm);
    const product = normalizeProduct(formData);

    if (!product.name || !product.detail || !product.image || !product.tag) {
      showToast('Remplissez tous les champs');
      return;
    }

    if (!Number.isFinite(product.price) || product.price < 0) {
      showToast('Prix invalide');
      return;
    }

    addProduct(product);
    productForm.reset();
    document.querySelector('#product-category').value = 'iPhone';
  });
}

const resetButton = document.querySelector('#reset-products');
if (resetButton) {
  resetButton.addEventListener('click', resetProducts);
}

renderProducts();
renderCart();
renderAdmin();
setDeliveryMode('Livraison');
