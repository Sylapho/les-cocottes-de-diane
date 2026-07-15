# Démo portfolio Les cocottes de Diane

Cette page sert de guide court pour lancer Les cocottes de Diane en local et présenter le scénario métier à un recruteur technique.

## Objectif

Montrer un parcours Click & Collect complet : catalogue client, panier, checkout Stripe, création de commande, puis suivi opérationnel côté back-office avec stock, préparation et caisse.

## Prérequis

- Node.js 22.
- pnpm 11.4.0.
- Docker Desktop ou Docker Engine pour PostgreSQL.
- Des clés Stripe de test si la démo doit aller jusqu'à la redirection Checkout.
- Aucun secret réel ne doit être commit dans le dépôt.

## Commandes principales

Installation :

```bash
pnpm install
```

Environnement :

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
cp apps/shop/.env.example apps/shop/.env.local
```

Base de données :

```bash
pnpm db:up
pnpm db:generate
pnpm db:migrate
```

Seed :

```bash
pnpm db:seed
```

Développement :

```bash
pnpm dev
```

Tests :

```bash
pnpm test
pnpm test:api:e2e
pnpm test:shop:e2e
```

Build :

```bash
pnpm build
```

## URLs locales

- Boutique client : `http://localhost:3001`
- Checkout : `http://localhost:3001/checkout`
- Suivi client : `http://localhost:3001/suivi`
- Back-office : `http://localhost:3000`
- Commandes back-office : `http://localhost:3000/commandes`
- Préparation : `http://localhost:3000/preparation`
- Stock : `http://localhost:3000/stock`
- Caisse : `http://localhost:3000/caisse`
- API health : `http://localhost:4000/api/health`
- API readiness : `http://localhost:4000/api/health/ready`

## Scénario recruteur

1. Ouvrir la boutique sur `http://localhost:3001`.
2. Consulter les produits chargés par le seed.
3. Ajouter un produit au panier.
4. Ouvrir le panier puis aller au checkout.
5. Renseigner les coordonnées, le lieu et la date de retrait.
6. Lancer le paiement Stripe avec une clé `STRIPE_SECRET_KEY` de test. Sans clé Stripe, expliquer que la commande ne peut pas être finalisée mais que le flux jusqu'à la préparation du paiement est visible.
7. Après paiement test et webhook local, ouvrir la commande depuis la page de succès ou le suivi client.
8. Ouvrir le back-office sur `http://localhost:3000`.
9. Se connecter avec un compte Better Auth existant. Le seed standard ne crée pas de compte de démonstration et les inscriptions sont désactivées ; `pnpm screenshots` crée pour sa part un compte éphémère dans sa base isolée.
10. Ouvrir `Commandes` pour montrer les commandes en ligne, les statuts et les besoins de préparation.
11. Ouvrir `Préparation` pour montrer les commandes regroupées par date et point de retrait.
12. Ouvrir `Stock` pour montrer les articles, matières premières, lots, mouvements et actions de réception/production/perte.
13. Ouvrir `Caisse` pour montrer la journée, les ventes et la clôture si des ventes ont été saisies.
14. Ouvrir `Admin > Stripe` uniquement avec un compte `gerant` pour montrer les réconciliations si des cas de paiement existent.

## Disponible aujourd'hui

- Catalogue boutique alimenté par `pnpm db:seed`.
- Panier local et checkout client.
- Redirection Stripe Checkout lorsque les clés de test sont configurées.
- Suivi client par token.
- Back-office commandes, préparation, stock, caisse, articles, matières premières et réconciliations Stripe.
- Health checks API `/api/health` et `/api/health/ready`.

## À préparer manuellement

- Un compte Better Auth de démonstration pour une démo interactive lancée avec `pnpm dev` ; la génération automatisée des captures gère son propre compte isolé.
- Une session Stripe CLI si la démo doit valider les webhooks localement. Voir [`docs/STRIPE_CLI_CHECKOUT.md`](STRIPE_CLI_CHECKOUT.md).
- Une régénération avec `pnpm screenshots` après toute évolution visuelle importante.

## Captures recommandées

Neuf captures prêtes pour le README et le portfolio sont versionnées dans [`docs/screenshots`](screenshots/README.md). Elles couvrent le catalogue, le panier, le checkout, le suivi public, le responsive mobile, le tableau de bord, les commandes, la préparation et le stock.

Pour les régénérer à partir d'une base locale isolée et de données fictives :

```bash
pnpm screenshots
```

La commande prépare `localco_screenshots`, crée un compte Better Auth éphémère, construit les applications en production et remplace les fichiers existants. Stripe et Resend ne sont pas appelés. La procédure détaillée, les routes, résolutions, formats et dates sont documentés dans [`docs/screenshots/README.md`](screenshots/README.md).

## Liens utiles

- [README principal](../README.md)
- [API](../apps/api/README.md)
- [Back-office](../apps/web/README.md)
- [Boutique](../apps/shop/README.md)
- [Déploiement](DEPLOYMENT.md)
