# Captures portfolio

Ce dossier contient les captures de référence utilisées dans le README et dans le portfolio. Elles sont produites automatiquement à partir d'une base PostgreSQL locale dédiée, de données fictives et des builds de production de l'API, du back-office et de la boutique.

## Inventaire

| Fichier | Page ou état capturé | Résolution | Format | Mise à jour |
| --- | --- | --- | --- | --- |
| `shop-catalog-desktop.png` | Boutique, catalogue `/#produits` | 1440 × 1000 | PNG | 2026-07-16 |
| `shop-cart-desktop.png` | Boutique, panier ouvert après ajout de deux produits | 1440 × 1000 | PNG | 2026-07-16 |
| `shop-checkout-desktop.png` | Checkout `/checkout`, retrait sélectionné et coordonnées fictives | 1440 × 1000 | PNG | 2026-07-16 |
| `shop-order-tracking-desktop.png` | Suivi public `/suivi?token=<demo-token>` | 1440 × 1000 | PNG | 2026-07-16 |
| `shop-home-mobile.png` | Accueil boutique responsive `/` | 390 × 844 | PNG | 2026-07-16 |
| `backoffice-dashboard-desktop.png` | Tableau de bord interne `/` | 1440 × 1000 | PNG | 2026-07-16 |
| `backoffice-orders-desktop.png` | Commandes et besoins de production `/commandes` | 1440 × 1000 | PNG | 2026-07-16 |
| `backoffice-preparation-desktop.png` | Préparation, vue globale `/preparation?date=all` | 1440 × 1000 | PNG | 2026-07-16 |
| `backoffice-stock-desktop.png` | Pilotage du stock et des DLC `/stock` | 1440 × 1000 | PNG | 2026-07-16 |

## Régénération

Prérequis : dépendances pnpm installées, Docker disponible et navigateur Chromium Playwright installé.

Depuis la racine du dépôt :

```bash
pnpm screenshots
```

La commande :

1. démarre uniquement le service PostgreSQL de Docker Compose ;
2. crée si nécessaire la base locale `localco_screenshots` ;
3. applique les migrations et recharge le catalogue ;
4. ajoute des commandes, ventes, mouvements et utilisateurs entièrement fictifs ;
5. crée un compte administrateur éphémère avec un mot de passe aléatoire ;
6. construit les trois applications en mode production ;
7. lance Playwright Chromium et remplace les neuf fichiers aux noms stables.

La génération refuse une URL distante ou une base dont le nom ne contient pas `screenshot`. Elle ne lit pas les données de `localco_db`, n'appelle ni Stripe ni Resend et ne nécessite aucun secret de production.

La base peut être personnalisée sans modifier les fichiers locaux :

```bash
SCREENSHOTS_DATABASE_URL=postgresql://localco:localco_dev@localhost:5432/my_screenshots pnpm screenshots
```

Sous PowerShell :

```powershell
$env:SCREENSHOTS_DATABASE_URL='postgresql://localco:localco_dev@localhost:5432/my_screenshots'
pnpm screenshots
```

Après régénération, contrôler visuellement les neuf images, vérifier qu'aucune donnée sensible n'apparaît, puis mettre à jour la date du tableau si le rendu a changé.
