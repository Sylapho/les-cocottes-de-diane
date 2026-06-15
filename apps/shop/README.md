# LocalCo Shop

Application frontend boutique de **LocalCo**, développée avec **Next.js**, **TypeScript** et **Tailwind CSS**.

Cette application correspond à la partie publique / client de LocalCo. Elle permet aux utilisateurs de consulter les produits disponibles, composer une commande, passer au paiement et suivre le résultat du paiement.

---

## Sommaire

* [Rôle de l’application](#rôle-de-lapplication)
* [Stack technique](#stack-technique)
* [Prérequis](#prérequis)
* [Installation](#installation)
* [Variables d’environnement](#variables-denvironnement)
* [Commandes utiles](#commandes-utiles)
* [Lancer l’application](#lancer-lapplication)
* [Build](#build)
* [Tests et vérifications](#tests-et-vérifications)
* [Architecture du dossier](#architecture-du-dossier)
* [Communication avec l’API](#communication-avec-lapi)
* [Parcours de commande](#parcours-de-commande)
* [Paiement Stripe](#paiement-stripe)
* [Gestion des erreurs](#gestion-des-erreurs)
* [Conventions de développement](#conventions-de-développement)
* [Accessibilité et UX](#accessibilité-et-ux)
* [Dépannage](#dépannage)
* [Bonnes pratiques avant commit](#bonnes-pratiques-avant-commit)

---

## Rôle de l’application

`apps/shop` est l’interface boutique de LocalCo.

Elle est responsable de :

* afficher les produits disponibles à la vente ;
* présenter les informations utiles aux clients ;
* gérer le panier ou la sélection de produits ;
* créer une commande via l’API ;
* rediriger l’utilisateur vers Stripe Checkout ;
* afficher une page de succès après paiement ;
* afficher une page d’annulation ou d’échec ;
* donner un retour clair à l’utilisateur après chaque action.

Cette application ne doit pas contenir de logique métier critique liée au stock ou au paiement.

Les règles importantes doivent rester côté API :

* disponibilité réelle du stock ;
* réservation du stock ;
* validation du paiement ;
* montant final ;
* statut de commande ;
* annulation ;
* réconciliation Stripe.

Le frontend doit afficher l’état fourni par l’API, mais ne doit jamais être considéré comme une source de vérité.

---

## Stack technique

L’application utilise principalement :

* **Next.js** pour le frontend ;
* **React** pour les composants ;
* **TypeScript** pour le typage ;
* **Tailwind CSS** pour le style ;
* **pnpm** comme gestionnaire de paquets ;
* **Docker** pour l’environnement local ;
* **Stripe Checkout** pour le paiement côté client.

---

## Prérequis

Depuis la racine du monorepo, il faut avoir :

* Node.js compatible avec le projet ;
* pnpm installé ;
* Docker et Docker Compose si l’environnement local utilise Docker ;
* l’API LocalCo lancée ;
* une configuration `.env` valide.

Vérifier les versions :

```bash
node -v
pnpm -v
docker -v
docker compose version
```

---

## Installation

Depuis la racine du monorepo :

```bash
pnpm install
```

Si le projet utilise Prisma côté API, générer le client Prisma depuis la racine si nécessaire :

```bash
pnpm --filter @localco/api exec prisma generate
```

---

## Variables d’environnement

Créer un fichier `.env.local` dans `apps/shop` si nécessaire.

Exemple :

```env
# App
NEXT_PUBLIC_SHOP_URL=http://localhost:3001

# API
NEXT_PUBLIC_API_URL=http://localhost:3000

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_replace_me
```

Les noms exacts des variables sont à vérifier dans le code de `apps/shop`.

Les variables exposées au navigateur doivent commencer par :

```txt
NEXT_PUBLIC_
```

Ne jamais mettre de secret côté frontend.

À ne jamais mettre dans `apps/shop/.env.local` :

```env
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=xxx
```

Ces variables doivent rester côté API.

---

## Commandes utiles

Toutes les commandes suivantes sont à lancer depuis la racine du monorepo.

### Développement

```bash
pnpm --filter @localco/shop dev
```

### Build

```bash
pnpm --filter @localco/shop build
```

### Lint

```bash
pnpm --filter @localco/shop lint
```

### Tests

Si des tests sont configurés :

```bash
pnpm --filter @localco/shop test
```

### Vérification TypeScript

Si une commande dédiée existe :

```bash
pnpm --filter @localco/shop typecheck
```

Sinon, utiliser la commande disponible dans le `package.json` de `apps/shop`.

---

## Lancer l’application

Depuis la racine du monorepo :

```bash
pnpm --filter @localco/shop dev
```

L’application devrait être disponible sur :

```txt
http://localhost:3001
```

Selon la configuration du projet, le port peut être différent.

Pour lancer l’application avec Docker :

```bash
docker compose up shop
```

Ou pour lancer tout l’environnement :

```bash
docker compose up
```

---

## Build

Pour vérifier que l’application compile correctement :

```bash
pnpm --filter @localco/shop build
```

Cette commande permet de détecter :

* les erreurs TypeScript ;
* les erreurs de routes Next.js ;
* les erreurs de variables d’environnement manquantes ;
* les erreurs liées aux composants serveur/client ;
* les erreurs d’import ;
* les problèmes de rendu pendant le build.

---

## Tests et vérifications

Avant de pousser une modification, lancer au minimum :

```bash
pnpm --filter @localco/shop lint
pnpm --filter @localco/shop build
```

Si des tests sont disponibles :

```bash
pnpm --filter @localco/shop test
```

Si une commande TypeScript dédiée existe :

```bash
pnpm --filter @localco/shop typecheck
```

---

## Architecture du dossier

Structure indicative :

```txt
apps/shop/
├── app/
│   ├── page.tsx
│   ├── layout.tsx
│   ├── success/
│   ├── cancel/
│   └── ...
├── components/
│   ├── ui/
│   ├── product/
│   ├── cart/
│   └── checkout/
├── lib/
│   ├── api.ts
│   ├── utils.ts
│   └── ...
├── hooks/
├── styles/
├── public/
├── package.json
├── next.config.ts
├── tsconfig.json
└── README.md
```

Les noms exacts peuvent varier selon l’état actuel du projet.

---

## Communication avec l’API

L’application `shop` communique avec l’API LocalCo pour :

* récupérer les articles disponibles ;
* récupérer les informations nécessaires à l’affichage de la boutique ;
* créer une commande ;
* initier un paiement ;
* récupérer le statut d’une commande ;
* afficher le résultat du paiement.

L’URL de l’API doit être configurée via une variable d’environnement :

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

Exemple de principe côté frontend :

```ts
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
```

Le frontend ne doit pas appeler directement Stripe avec une clé secrète.

Le frontend doit demander à l’API de créer une session de paiement, puis rediriger l’utilisateur vers l’URL retournée par l’API.

---

## Parcours de commande

Le parcours attendu est généralement :

1. Le client consulte les produits disponibles.
2. Le client choisit ses produits.
3. Le client valide sa sélection.
4. Le frontend demande à l’API de créer une commande.
5. L’API vérifie le stock.
6. L’API réserve le stock si nécessaire.
7. L’API crée une session Stripe Checkout.
8. Le frontend redirige vers Stripe.
9. Stripe traite le paiement.
10. Stripe redirige le client vers la page de succès ou d’annulation.
11. Le webhook Stripe confirme réellement la commande côté API.

Important : la page de succès côté frontend ne doit pas confirmer seule la commande.
La confirmation réelle doit venir du webhook Stripe traité par l’API.

---

## Paiement Stripe

Le paiement est géré via Stripe Checkout.

Le frontend peut recevoir une URL de paiement depuis l’API, puis rediriger l’utilisateur :

```ts
window.location.href = checkoutUrl;
```

Le frontend ne doit jamais manipuler :

* `STRIPE_SECRET_KEY` ;
* `STRIPE_WEBHOOK_SECRET` ;
* les montants finaux de manière fiable ;
* le statut définitif de paiement ;
* la confirmation réelle d’une commande.

Ces éléments doivent rester côté API.

### Page de succès

La page de succès doit afficher un message clair après retour de Stripe.

Exemple de contenu attendu :

```txt
Merci pour votre commande.
Votre paiement est en cours de confirmation.
Vous recevrez une confirmation dès que la commande sera validée.
```

Même si Stripe redirige vers la page de succès, il faut garder en tête que la source de vérité reste le webhook côté API.

### Page d’annulation

La page d’annulation doit expliquer simplement que le paiement n’a pas été finalisé.

Exemple :

```txt
Le paiement a été annulé.
Votre commande n’a pas été confirmée.
Vous pouvez revenir à la boutique et réessayer.
```

Selon le comportement API, le stock réservé peut être libéré plus tard par un traitement d’expiration ou d’annulation.

---

## Gestion des erreurs

L’application doit afficher des erreurs compréhensibles pour l’utilisateur.

Exemples :

* produit indisponible ;
* stock insuffisant ;
* commande impossible à créer ;
* erreur réseau ;
* paiement non disponible ;
* session expirée ;
* API indisponible.

Les messages techniques ne doivent pas être affichés directement au client.

Mauvais exemple :

```txt
PrismaClientKnownRequestError: Transaction failed
```

Bon exemple :

```txt
Une erreur est survenue lors de la création de votre commande. Veuillez réessayer.
```

Pour le développement, les erreurs techniques peuvent être loggées dans la console, mais il faut éviter d’exposer des informations sensibles.

---

## Conventions de développement

### Composants

Les composants doivent être :

* simples ;
* typés ;
* réutilisables quand c’est pertinent ;
* séparés par responsabilité.

Exemples :

```txt
ProductCard
ProductList
CartSummary
CheckoutButton
EmptyState
ErrorMessage
LoadingState
```

### Données

La récupération des données doit être centralisée autant que possible.

Exemple :

```txt
lib/api.ts
lib/shop.ts
lib/orders.ts
```

Éviter de dupliquer les appels API dans plusieurs composants.

### TypeScript

Éviter `any` autant que possible.

Mauvais exemple :

```ts
function ProductCard({ product }: any) {
  return <div>{product.name}</div>;
}
```

Bon exemple :

```ts
type Product = {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
};

function ProductCard({ product }: { product: Product }) {
  return <div>{product.name}</div>;
}
```

### États de chargement

Chaque page qui dépend de données externes doit gérer :

* l’état de chargement ;
* l’état vide ;
* l’état erreur ;
* l’état succès.

Exemples :

```txt
Chargement des produits...
Aucun produit disponible pour le moment.
Impossible de charger la boutique.
```

---

## Accessibilité et UX

L’application doit rester simple et compréhensible pour un client.

Bonnes pratiques :

* utiliser des boutons visibles ;
* éviter les textes trop techniques ;
* afficher clairement les prix ;
* afficher clairement les quantités ;
* afficher les erreurs près de l’action concernée ;
* désactiver les boutons pendant les actions en cours ;
* éviter les doubles clics sur le bouton de paiement ;
* prévoir un état panier vide ;
* prévoir un état produit indisponible ;
* utiliser des textes alternatifs sur les images ;
* garder une navigation claire.

Exemple pour un bouton de paiement :

```tsx
<button disabled={isLoading || cartIsEmpty}>
  {isLoading ? "Redirection vers le paiement..." : "Passer au paiement"}
</button>
```

---

## Sécurité

Même si `apps/shop` est une application frontend, elle doit respecter certaines règles :

* ne jamais exposer de secrets ;
* ne jamais faire confiance aux données côté client ;
* ne jamais calculer seule le montant final fiable ;
* ne jamais confirmer une commande côté frontend ;
* valider les actions côté API ;
* gérer proprement les erreurs ;
* éviter d’exposer les détails techniques à l’utilisateur ;
* éviter les appels API inutiles ou non protégés ;
* ne pas stocker d’informations sensibles dans le navigateur.

Les variables publiques `NEXT_PUBLIC_*` sont visibles par l’utilisateur dans le navigateur.
Il ne faut donc jamais y mettre de clé secrète.

---

## Dépannage

### L’application ne démarre pas

Vérifier l’installation des dépendances :

```bash
pnpm install
```

Puis relancer :

```bash
pnpm --filter @localco/shop dev
```

### Le port est déjà utilisé

Si le port `3001` est déjà utilisé, arrêter le processus concerné ou modifier le port de lancement.

Sous Windows PowerShell :

```powershell
netstat -ano | findstr :3001
```

### L’API n’est pas joignable

Vérifier que l’API est lancée :

```bash
pnpm --filter @localco/api dev
```

Vérifier ensuite la variable :

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Les produits ne s’affichent pas

Vérifier :

* que l’API fonctionne ;
* que la base de données contient des produits ;
* que les produits sont disponibles à la vente ;
* que l’URL API est correcte ;
* que la route appelée par le frontend existe toujours.

### Le paiement ne fonctionne pas

Vérifier :

* que l’API possède les variables Stripe nécessaires ;
* que la clé publique Stripe côté frontend est correcte si elle est utilisée ;
* que la commande est bien créée côté API ;
* que l’API retourne bien une URL Stripe Checkout ;
* que le webhook Stripe est configuré côté API ;
* que les URLs de succès et d’annulation sont correctes.

### Erreur de variable d’environnement

Après modification d’un fichier `.env.local`, il faut redémarrer le serveur Next.js :

```bash
pnpm --filter @localco/shop dev
```

Next.js ne recharge pas toujours toutes les variables d’environnement sans redémarrage.

### Problème de hot reload avec Docker

Si le hot reload ne fonctionne pas correctement avec Docker :

```bash
docker compose down
docker compose up --build
```

Vérifier aussi que les volumes sont correctement configurés dans `docker-compose.yml`.

---

## Bonnes pratiques avant commit

Avant de commit une modification sur `apps/shop`, lancer :

```bash
pnpm --filter @localco/shop lint
pnpm --filter @localco/shop build
```

Si des tests existent :

```bash
pnpm --filter @localco/shop test
```

Si la modification touche aussi l’API :

```bash
pnpm --filter @localco/api lint
pnpm --filter @localco/api test --runInBand
pnpm --filter @localco/api build
```

---

## Exemples de messages de commit

```bash
docs(shop): add shop README
fix(shop): improve checkout error handling
feat(shop): add payment success page
feat(shop): add empty cart state
refactor(shop): centralize API calls
style(shop): improve product card layout
```

---

## Notes importantes

`apps/shop` est la vitrine client de LocalCo.

L’objectif principal est d’offrir une expérience simple, claire et fiable :

* les produits doivent être faciles à comprendre ;
* le parcours de commande doit être fluide ;
* les erreurs doivent être lisibles ;
* le paiement doit être rassurant ;
* les états après paiement doivent être explicites.

La logique critique doit rester côté API.

Le frontend affiche, guide et redirige.
L’API valide, réserve, confirme et protège les données.
