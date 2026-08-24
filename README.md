# SLY MOBILE

## Structure

- `client.html` : boutique client
- `admin.html` : espace administrateur
- `client.js` : logique client
- `admin.js` : logique admin
- `server.js` : API Node/Express
- `db.js` : connexion MySQL
- `schema.sql` : schéma de base de données
- `styles.css` : styles partagés

## Démarrage

1. Crée la base MySQL avec `schema.sql`.
2. Copie `.env.example` vers `.env`.
3. Renseigne les variables MySQL et le mot de passe admin.
4. Installe les dépendances avec `npm install`.
5. Lance le serveur avec `npm start`.

## Routes

- `/` : boutique client
- `/admin` : interface admin
- `/api/products` : produits publics
- `/api/orders` : création de commande
- `/api/admin/login` : connexion admin
- `/api/admin/products` : gestion des produits
- `/api/admin/orders` : consultation des commandes
