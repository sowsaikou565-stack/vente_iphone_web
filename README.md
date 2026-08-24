# SLY MOBILE

Application web de vente d'iPhones et d'accessoires pour SLY MOBILE, situee a Cotonou au Benin.

## Fonctionnement de la boutique

1. Le client cree un compte lors de sa premiere visite.
2. Lors des visites suivantes, il se connecte avec son email ou son numero de telephone.
3. Il consulte les iPhones, les accessoires et la categorie Promotions.
4. Il ajoute ses articles au panier ou commande directement.
5. Il choisit la livraison ou le retrait en boutique.
6. En cas de livraison, il renseigne son adresse. Le tarif est ensuite confirme par le proprietaire selon la zone.
7. La commande est enregistree dans MySQL et un message detaille est ouvert sur WhatsApp au `+229 62 32 95 41`.

Le paiement et la livraison sont finalises directement avec le proprietaire sur WhatsApp.

## Administration

L'administrateur se connecte sur `/admin` avec le mot de passe configure dans `.env`.

Les rubriques sont independantes :

- Tableau de bord et statistiques
- Commandes : validation, annulation et suppression
- Produits : ajout, stock, prix et promotion
- Clients
- Analytique
- Notifications et parametres

Une commande en attente ou annulee n'augmente pas les statistiques. Le chiffre d'affaires, le nombre de commandes, les clients et le graphique prennent en compte uniquement les commandes validees.

## Apparence

Le site client propose un mode clair et un mode sombre. Le choix du client est conserve dans son navigateur. Le design est responsive et fonctionne sur ordinateur, tablette et telephone.

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

Le site est ensuite disponible sur `http://localhost:3000` et l'administration sur `http://localhost:3000/admin`.

## Publication GitHub

Le projet est versionne avec Git sur la branche `main` et publie dans le repository GitHub :

`https://github.com/sowsaikou565-stack/vente_iphone_web`

Pour envoyer de nouvelles modifications :

```powershell
git add .
git commit -m "Decrire la modification"
git push
```

Le repository GitHub sert a stocker le code. Pour mettre l'application en ligne, il faut ensuite deployer le serveur Node.js et connecter une base MySQL hebergee.

## Securite

- Ne jamais envoyer `.env` sur GitHub.
- Modifier `ADMIN_PASSWORD` et `ADMIN_SECRET` avant la mise en production.
- Utiliser des identifiants MySQL de production distincts des identifiants locaux.
- Le fichier `.env.example` sert uniquement de modele de configuration.

## Routes

- `/` : boutique client
- `/admin` : interface admin
- `/api/products` : produits publics
- `/api/orders` : création de commande
- `/api/admin/login` : connexion admin
- `/api/admin/products` : gestion des produits
- `/api/admin/orders` : consultation des commandes
- `/api/customer/register` : inscription client
- `/api/customer/login` : connexion client
- `/api/customer/me` : verification de session client
- `/api/admin/orders/:id/status` : validation ou annulation d'une commande
- `/api/admin/orders/:id` : suppression d'une commande
