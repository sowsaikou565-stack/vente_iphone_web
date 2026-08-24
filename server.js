import crypto from 'crypto';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './db.js';

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 3000);
const STORE_NAME = 'SLY MOBILE';
const WHATSAPP_NUMBER = '22962329541';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '1234';
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'change-me-now';
const uploadsDirectory = path.join(__dirname, 'uploads');
fs.mkdirSync(uploadsDirectory, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: uploadsDirectory,
    filename: (_req, file, callback) => callback(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '-')}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => callback(null, /^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)),
});

const DEFAULT_PRODUCTS = [
  {
    name: 'iPhone 15 Pro',
    category: 'iPhone',
    detail: '256 Go · Titane naturel',
    price: 675000,
    stock: 5,
    tag: 'Vedette',
    image_url: 'https://images.unsplash.com/photo-1696446701796-da61225697cc?auto=format&fit=crop&w=700&q=85',
  },
  {
    name: 'iPhone 13',
    category: 'iPhone',
    detail: '128 Go · Minuit',
    price: 395000,
    stock: 8,
    tag: 'Disponible',
    image_url: 'https://images.unsplash.com/photo-1632661674596-df8be070a5c5?auto=format&fit=crop&w=700&q=85',
  },
  {
    name: 'Coque silicone',
    category: 'Accessoires',
    detail: 'Protection · Plusieurs couleurs',
    price: 8500,
    stock: 24,
    tag: 'Nouveau',
    image_url: 'https://images.unsplash.com/photo-1601593346740-925612772716?auto=format&fit=crop&w=700&q=85',
  },
  {
    name: 'AirPods Pro',
    category: 'Accessoires',
    detail: '2e génération · USB-C',
    price: 125000,
    stock: 10,
    tag: 'Promo',
    image_url: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=700&q=85',
  },
  {
    name: 'iPhone 14',
    category: 'iPhone',
    detail: '128 Go · Bleu',
    price: 475000,
    stock: 6,
    tag: 'Promo',
    image_url: 'https://images.unsplash.com/photo-1678652197831-2d180705cd2c?auto=format&fit=crop&w=700&q=85',
  },
  {
    name: 'Chargeur USB-C',
    category: 'Accessoires',
    detail: '20 W · Charge rapide',
    price: 12000,
    stock: 18,
    tag: 'Promo',
    image_url: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=700&q=85',
  },
  {
    name: 'iPhone 15',
    category: 'iPhone',
    detail: '128 Go · Rose',
    price: 550000,
    stock: 4,
    tag: 'Nouveau',
    image_url: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=700&q=85',
  },
  {
    name: 'Verre trempé',
    category: 'Accessoires',
    detail: 'Protection écran · HD',
    price: 5000,
    stock: 30,
    tag: 'Essentiel',
    image_url: 'https://images.unsplash.com/photo-1567581935884-3349723552ca?auto=format&fit=crop&w=700&q=85',
  },
];

function signToken(payload) {
  const raw = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', ADMIN_SECRET)
    .update(raw)
    .digest('base64url');

  return `${raw}.${signature}`;
}

function verifyToken(token) {
  if (!token || !token.includes('.')) {
    return null;
  }

  const [raw, signature] = token.split('.');
  const expected = crypto.createHmac('sha256', ADMIN_SECRET).update(raw).digest('base64url');

  if (signature !== expected) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
    if (typeof payload.exp !== 'number' || payload.exp < Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, (error, derivedKey) => {
      if (error) return reject(error);
      resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

function verifyPassword(password, storedHash) {
  return new Promise((resolve, reject) => {
    const [salt, key] = String(storedHash).split(':');
    if (!salt || !key) return resolve(false);
    crypto.scrypt(password, salt, 64, (error, derivedKey) => {
      if (error) return reject(error);
      const expected = Buffer.from(key, 'hex');
      resolve(expected.length === derivedKey.length && crypto.timingSafeEqual(expected, derivedKey));
    });
  });
}

function requireCustomer(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  const payload = verifyToken(token);
  if (!payload || payload.role !== 'customer') return res.status(401).json({ error: 'Unauthorized' });
  req.customer = payload;
  return next();
}

function requireAdmin(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  const payload = verifyToken(token);

  if (!payload || payload.role !== 'admin') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  req.admin = payload;
  return next();
}

async function initDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      name VARCHAR(160) NOT NULL,
      category VARCHAR(60) NOT NULL,
      detail VARCHAR(255) NOT NULL,
      price INT UNSIGNED NOT NULL,
      stock INT UNSIGNED NOT NULL DEFAULT 0,
      tag VARCHAR(60) NOT NULL,
      image_url VARCHAR(500) NOT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      customer_name VARCHAR(120) NOT NULL,
      customer_phone VARCHAR(40) NOT NULL,
      delivery_mode VARCHAR(20) NOT NULL,
      address TEXT NULL,
      total_amount INT UNSIGNED NOT NULL,
      whatsapp_message LONGTEXT NOT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      name VARCHAR(120) NOT NULL,
      phone VARCHAR(40) NOT NULL,
      email VARCHAR(190) NOT NULL,
      password_hash VARCHAR(180) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY customers_email_unique (email),
      UNIQUE KEY customers_phone_unique (phone)
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      order_id INT UNSIGNED NOT NULL,
      product_id INT UNSIGNED NOT NULL,
      product_name VARCHAR(160) NOT NULL,
      unit_price INT UNSIGNED NOT NULL,
      quantity INT UNSIGNED NOT NULL,
      line_total INT UNSIGNED NOT NULL,
      PRIMARY KEY (id),
      INDEX (order_id),
      CONSTRAINT fk_order_items_order
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );
  `);

  try {
    await pool.query('ALTER TABLE products ADD COLUMN stock INT UNSIGNED NOT NULL DEFAULT 0 AFTER price');
  } catch {
    // Column already exists on upgraded databases.
  }

  const [rows] = await pool.query('SELECT COUNT(*) AS total FROM products');
  if (rows[0].total === 0) {
    const values = DEFAULT_PRODUCTS.map((product) => [
      product.name,
      product.category,
      product.detail,
      product.price,
      product.stock,
      product.tag,
      product.image_url,
    ]);

    await pool.query(
      'INSERT INTO products (name, category, detail, price, stock, tag, image_url) VALUES ?',
      [values],
    );
  }

  const [promoRows] = await pool.query(
    "SELECT COUNT(*) AS total FROM products WHERE LOWER(tag) LIKE '%promo%'",
  );

  if (promoRows[0].total === 0) {
    await pool.query(
      "UPDATE products SET tag = 'Promo' WHERE name IN ('AirPods Pro', 'iPhone 14', 'Chargeur USB-C')",
    );
  }
}

function buildWhatsAppMessage({ items, totalAmount, customerName, customerPhone, deliveryMode, address }) {
  const lines = items
    .map((item) => `- ${item.product_name} x${item.quantity} (${item.line_total.toLocaleString('fr-FR')} FCFA)`)
    .join('\n');

  if (deliveryMode === 'Livraison') {
    return [
      `Bonjour, je souhaite commander cet article sur ${STORE_NAME}.`,
      '',
      'Détails de la commande :',
      lines,
      '',
      `Total estimé : ${totalAmount.toLocaleString('fr-FR')} FCFA`,
      `Nom : ${customerName}`,
      `Téléphone : ${customerPhone}`,
      'Mode : Livraison',
      `Adresse : ${address}`,
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
    `Total estimé : ${totalAmount.toLocaleString('fr-FR')} FCFA`,
    `Nom : ${customerName}`,
    `Téléphone : ${customerPhone}`,
    'Mode : Retrait en boutique',
    '',
    'Je viendrai le récupérer en boutique. Merci de me confirmer la disponibilité.',
  ].join('\n');
}

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(uploadsDirectory));
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, store: STORE_NAME });
});

app.get('/api/products', async (_req, res, next) => {
  try {
  const [rows] = await pool.query(
    'SELECT id, name, category, detail, price, stock, tag, image_url FROM products WHERE is_active = 1 ORDER BY created_at DESC',
  );
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

app.post('/api/customer/register', async (req, res, next) => {
  try {
    const { name, phone, email, password } = req.body ?? {};
    if (!name?.trim() || !phone?.trim() || !email?.trim() || !password || password.length < 6) {
      return res.status(400).json({ error: 'Nom, téléphone, email et mot de passe de 6 caractères minimum requis' });
    }
    const normalizedEmail = email.trim().toLowerCase();
    const [existing] = await pool.query('SELECT id FROM customers WHERE email = ? OR phone = ?', [normalizedEmail, phone.trim()]);
    if (existing.length) return res.status(409).json({ error: 'Cet email ou ce numéro est déjà inscrit' });
    const passwordHash = await hashPassword(password);
    const [result] = await pool.query('INSERT INTO customers (name, phone, email, password_hash) VALUES (?, ?, ?, ?)', [name.trim(), phone.trim(), normalizedEmail, passwordHash]);
    const token = signToken({ role: 'customer', id: result.insertId, exp: Date.now() + 30 * 24 * 60 * 60 * 1000 });
    res.status(201).json({ token, customer: { name: name.trim(), phone: phone.trim(), email: normalizedEmail } });
  } catch (error) { next(error); }
});

app.post('/api/customer/login', async (req, res, next) => {
  try {
    const { identifier, password } = req.body ?? {};
    const [rows] = await pool.query('SELECT id, name, phone, email, password_hash FROM customers WHERE email = ? OR phone = ?', [identifier?.trim().toLowerCase(), identifier?.trim()]);
    if (!rows.length || !(await verifyPassword(password || '', rows[0].password_hash))) return res.status(401).json({ error: 'Identifiants incorrects' });
    const customer = rows[0];
    const token = signToken({ role: 'customer', id: customer.id, exp: Date.now() + 30 * 24 * 60 * 60 * 1000 });
    res.json({ token, customer: { name: customer.name, phone: customer.phone, email: customer.email } });
  } catch (error) { next(error); }
});

app.get('/api/customer/me', requireCustomer, async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT name, phone, email FROM customers WHERE id = ?', [req.customer.id]);
    if (!rows.length) return res.status(401).json({ error: 'Compte introuvable' });
    res.json(rows[0]);
  } catch (error) { next(error); }
});

app.post('/api/orders', async (req, res, next) => {
  try {
    const { customerName, customerPhone, deliveryMode, address = '', items = [] } = req.body ?? {};

    if (!customerName?.trim() || !customerPhone?.trim() || !deliveryMode || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (deliveryMode === 'Livraison' && !address.trim()) {
      return res.status(400).json({ error: 'Address is required for delivery' });
    }

    const ids = items.map((item) => Number(item.id)).filter(Number.isFinite);
    const [products] = await pool.query(
      `SELECT id, name, price FROM products WHERE id IN (${ids.map(() => '?').join(',')}) AND is_active = 1`,
      ids,
    );

    if (products.length !== ids.length) {
      return res.status(400).json({ error: 'One or more products are unavailable' });
    }

    const normalizedItems = items.map((item) => {
      const product = products.find((entry) => entry.id === Number(item.id));
      const quantity = Math.max(1, Number(item.qty || 1));
      const lineTotal = product.price * quantity;

      return {
        product_id: product.id,
        product_name: product.name,
        unit_price: product.price,
        quantity,
        line_total: lineTotal,
      };
    });

    const totalAmount = normalizedItems.reduce((sum, item) => sum + item.line_total, 0);
    const message = buildWhatsAppMessage({
      items: normalizedItems,
      totalAmount,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      deliveryMode,
      address: address.trim(),
    });

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [orderResult] = await connection.query(
        'INSERT INTO orders (customer_name, customer_phone, delivery_mode, address, total_amount, whatsapp_message) VALUES (?, ?, ?, ?, ?, ?)',
        [customerName.trim(), customerPhone.trim(), deliveryMode, address.trim() || null, totalAmount, message],
      );

      const orderId = orderResult.insertId;
      const itemRows = normalizedItems.map((item) => [
        orderId,
        item.product_id,
        item.product_name,
        item.unit_price,
        item.quantity,
        item.line_total,
      ]);

      await connection.query(
        'INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, line_total) VALUES ?',
        [itemRows],
      );

      await connection.commit();

      res.status(201).json({
        orderId,
        totalAmount,
        whatsappNumber: WHATSAPP_NUMBER,
        whatsappMessage: message,
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body ?? {};
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  const token = signToken({
    role: 'admin',
    exp: Date.now() + 12 * 60 * 60 * 1000,
  });

  res.json({ token, expiresInHours: 12 });
});

app.get('/api/admin/products', requireAdmin, async (_req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, category, detail, price, stock, tag, image_url, is_active, created_at, updated_at FROM products ORDER BY created_at DESC',
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/upload', requireAdmin, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Veuillez sélectionner une image valide (5 Mo maximum)' });
  res.status(201).json({ image_url: `/uploads/${req.file.filename}` });
});

app.post('/api/admin/products', requireAdmin, async (req, res, next) => {
  try {
    const { name, category, detail, price, stock, tag, image_url } = req.body ?? {};
    if (!name?.trim() || !category?.trim() || !detail?.trim() || !tag?.trim() || !image_url?.trim()) {
      return res.status(400).json({ error: 'Missing product fields' });
    }

    const numericPrice = Number(price);
    const numericStock = Number(stock ?? 0);
    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      return res.status(400).json({ error: 'Invalid price' });
    }
    if (!Number.isFinite(numericStock) || numericStock < 0) {
      return res.status(400).json({ error: 'Invalid stock' });
    }

    const [result] = await pool.query(
      'INSERT INTO products (name, category, detail, price, stock, tag, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name.trim(), category.trim(), detail.trim(), numericPrice, numericStock, tag.trim(), image_url.trim()],
    );

    const [rows] = await pool.query(
      'SELECT id, name, category, detail, price, stock, tag, image_url, is_active, created_at, updated_at FROM products WHERE id = ?',
      [result.insertId],
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    next(error);
  }
});

app.put('/api/admin/products/:id', requireAdmin, async (req, res, next) => {
  try {
    const productId = Number(req.params.id);
    const { name, category, detail, price, stock, tag, image_url, is_active } = req.body ?? {};

    const numericPrice = Number(price);
    const numericStock = Number(stock);
    const activeValue = Number(Boolean(is_active));

    const [result] = await pool.query(
      `UPDATE products
       SET name = ?, category = ?, detail = ?, price = ?, stock = ?, tag = ?, image_url = ?, is_active = ?
       WHERE id = ?`,
      [
        name?.trim(),
        category?.trim(),
        detail?.trim(),
        numericPrice,
        numericStock,
        tag?.trim(),
        image_url?.trim(),
        activeValue,
        productId,
      ],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const [rows] = await pool.query(
      'SELECT id, name, category, detail, price, stock, tag, image_url, is_active, created_at, updated_at FROM products WHERE id = ?',
      [productId],
    );

    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/admin/products/:id', requireAdmin, async (req, res, next) => {
  try {
    const productId = Number(req.params.id);
    const [result] = await pool.query('DELETE FROM products WHERE id = ?', [productId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/orders', requireAdmin, async (_req, res, next) => {
  try {
    const [orders] = await pool.query(
      'SELECT id, customer_name, customer_phone, delivery_mode, address, total_amount, status, whatsapp_message, created_at FROM orders ORDER BY created_at DESC',
    );

    const [items] = await pool.query(
      'SELECT order_id, product_name, unit_price, quantity, line_total FROM order_items ORDER BY id ASC',
    );

    const mapped = orders.map((order) => ({
      ...order,
      items: items.filter((item) => item.order_id === order.id),
    }));

    res.json(mapped);
  } catch (error) {
    next(error);
  }
});

app.patch('/api/admin/orders/:id/status', requireAdmin, async (req, res, next) => {
  try {
    const orderId = Number(req.params.id);
    const { status } = req.body ?? {};
    if (!['pending', 'validated', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid order status' });
    }
    const [result] = await pool.query('UPDATE orders SET status = ? WHERE id = ?', [status, orderId]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Order not found' });
    res.json({ id: orderId, status });
  } catch (error) { next(error); }
});

app.delete('/api/admin/orders/:id', requireAdmin, async (req, res, next) => {
  try {
    const orderId = Number(req.params.id);
    const [result] = await pool.query('DELETE FROM orders WHERE id = ?', [orderId]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Order not found' });
    res.status(204).send();
  } catch (error) { next(error); }
});

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'client.html'));
});

app.get('/admin', (_req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.use(express.static(__dirname));

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Internal server error' });
});

await initDatabase();

app.listen(PORT, () => {
  console.log(`SLY MOBILE running at http://localhost:${PORT}`);
});
