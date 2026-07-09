# Les cocottes de Diane Shop

Boutique publique Next.js pour le parcours Click & Collect client.

## Rôle

Cette application affiche le catalogue client, gère le panier côté navigateur, collecte les coordonnées et le point de retrait, puis lance le parcours de commande avec l'API.

Elle contient aussi les pages de retour après paiement, d'annulation, de suivi public et les pages d'information client.

## Configuration

Copier le fichier d'exemple de configuration de l'application shop vers le fichier local attendu par Next.js, puis renseigner l'URL de l'API locale.

## Commandes

Depuis la racine du monorepo, utiliser les scripts shop déjà exposés pour lancer, vérifier, tester et builder l'application.

Les commandes internes conservent volontairement le scope technique localco pour ne pas casser les scripts pnpm existants.

## Pages utiles en démo

- Page catalogue et panier.
- Page checkout.
- Page succès.
- Page annulation.
- Page suivi public.
- Pages d'information client.

## SEO technique

La boutique expose une configuration metadata globale dans `src/app/layout.tsx`.
Le domaine public de référence est lu depuis `NEXT_PUBLIC_SHOP_URL`.
En production, il doit valoir `https://lescocottesdediane.fr`.

Le fichier `/robots.txt` est généré par `src/app/robots.ts`.
Il autorise l'indexation uniquement lorsque `NEXT_PUBLIC_SHOP_URL` pointe vers
le domaine de production. Les environnements de développement, de staging, le
back-office et l'API ne doivent pas être indexés.

Le fichier `/sitemap.xml` est généré par `src/app/sitemap.ts`.
Il contient les pages publiques statiques, la home et les fiches articles
publiques construites à partir de l'API boutique. Les dates `lastModified` des
articles utilisent `updatedAt` ou `createdAt` quand l'API les fournit.

Pour tester localement :

- lancer la boutique avec les variables d'environnement locales ;
- ouvrir `http://localhost:3001/robots.txt` et vérifier `Disallow: /` hors
  production ;
- ouvrir `http://localhost:3001/sitemap.xml` et vérifier les URLs générées ;
- avec `NEXT_PUBLIC_SHOP_URL=https://lescocottesdediane.fr`, vérifier que le
  robots autorise les pages publiques et déclare le sitemap de production.

## Documentation liée

- README principal.
- Documentation de démo.
- Documentation de déploiement.
