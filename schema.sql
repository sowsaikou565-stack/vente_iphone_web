CREATE DATABASE IF NOT EXISTS sly_mobile CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sly_mobile;

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

INSERT INTO products (name, category, detail, price, stock, tag, image_url) VALUES
('iPhone 15 Pro', 'iPhone', '256 Go · Titane naturel', 675000, 5, 'Vedette', 'https://images.unsplash.com/photo-1696446701796-da61225697cc?auto=format&fit=crop&w=700&q=85'),
('iPhone 13', 'iPhone', '128 Go · Minuit', 395000, 8, 'Disponible', 'https://images.unsplash.com/photo-1632661674596-df8be070a5c5?auto=format&fit=crop&w=700&q=85'),
('Coque silicone', 'Accessoires', 'Protection · Plusieurs couleurs', 8500, 24, 'Nouveau', 'https://images.unsplash.com/photo-1601593346740-925612772716?auto=format&fit=crop&w=700&q=85'),
('AirPods Pro', 'Accessoires', '2e génération · USB-C', 125000, 10, 'Promo', 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=700&q=85'),
('iPhone 14', 'iPhone', '128 Go · Bleu', 475000, 6, 'Promo', 'https://images.unsplash.com/photo-1678652197831-2d180705cd2c?auto=format&fit=crop&w=700&q=85'),
('Chargeur USB-C', 'Accessoires', '20 W · Charge rapide', 12000, 18, 'Promo', 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=700&q=85'),
('iPhone 15', 'iPhone', '128 Go · Rose', 550000, 4, 'Nouveau', 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=700&q=85'),
('Verre trempé', 'Accessoires', 'Protection écran · HD', 5000, 30, 'Essentiel', 'https://images.unsplash.com/photo-1567581935884-3349723552ca?auto=format&fit=crop&w=700&q=85');
