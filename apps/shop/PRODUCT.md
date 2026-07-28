# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Les utilisateurs principaux sont des clients locaux de Les Cocottes de Diane, souvent sur mobile et dans une situation d’achat rapide. Ils veulent savoir ce qui est disponible, comprendre les produits et leurs allergènes, choisir un retrait compatible avec leur agenda, payer en ligne puis retrouver les informations utiles à leur commande.

Le parcours public ne suppose pas la création d’un compte client. Le suivi est accessible par un lien privé associé à la commande.

## Product Purpose

La boutique permet de commander des produits alimentaires locaux en Click & Collect, sans livraison à domicile. Le parcours de référence est :

1. découvrir ou rechercher les produits ;
2. choisir une catégorie et vérifier les informations produit ;
3. ajouter les quantités souhaitées au panier ;
4. choisir un point et une date de retrait disponibles ;
5. renseigner ses coordonnées ;
6. payer en ligne ;
7. consulter la confirmation et le suivi de commande.

Le succès produit signifie qu’un client comprend immédiatement l’offre, la disponibilité, le prix et les modalités de retrait, puis termine sa commande avec peu d’hésitation et sans assistance.

## Positioning

Les Cocottes de Diane relie un catalogue alimentaire réellement disponible à des lieux et calendriers de retrait locaux. La valeur spécifique du produit ne réside pas dans un catalogue e-commerce générique, mais dans la coordination fiable entre disponibilité, préparation, marchés ou points de retrait, paiement et suivi.

## Operating Context

- La boutique est en français et cible une clientèle locale dans l’Eure.
- Les commandes sont retirées sur des marchés, à la ferme ou dans d’autres points configurés par l’API.
- Chaque point de retrait possède un libellé, un horaire et des jours autorisés ; certains peuvent suivre une alternance de deux semaines.
- Les commandes pour le lendemain sont possibles jusqu’à 14 h, heure de Paris. Après cette limite, la première date compatible suivante est proposée.
- Le panier est conservé localement sur l’appareil utilisé.
- Le paiement est préparé par l’API puis effectué sur une page Stripe sécurisée.
- Une confirmation par e-mail et un lien public muni d’un jeton permettent de retrouver la commande sans espace client.

## Capabilities and Constraints

- Catalogue alimenté par l’API avec nom, catégorie, prix TTC, stock, image, description, ingrédients et allergènes.
- Recherche textuelle sur le nom, la description, les ingrédients et les allergènes.
- Filtrage par catégorie et option « En stock ».
- Catégories présentées sous forme d’accordéons, fermés par défaut.
- Panier persistant avec quantités de 1 à 99, suppression, total TTC et accès mobile fixe lorsqu’il contient des articles.
- Checkout en trois étapes : retrait, coordonnées, validation avant paiement.
- Gestion explicite du panier vide, des points ou dates indisponibles, des ruptures de stock, des erreurs réseau et des erreurs de paiement.
- Pages de confirmation, d’annulation et de suivi avec états manquants, introuvables, en attente ou indisponibles.
- Pages légales et informations Click & Collect accessibles publiquement.
- Aucune livraison à domicile ni expédition.
- Les prix, disponibilités, dates de retrait, coordonnées et statuts de commande sont des informations fonctionnelles prioritaires.

Décisions produit encore ouvertes :

- Le comportement attendu du bouton d’ajout pour un article sans stock n’est pas entièrement cohérent entre le catalogue, la fiche produit et la validation du checkout.
- Le niveau de précision souhaité pour afficher le stock au client n’est pas confirmé : état binaire, quantité restante ou message de disponibilité limitée.
- Le périmètre futur d’éventuels créneaux horaires distincts de la date de retrait n’est pas établi par l’implémentation actuelle.

## Brand Commitments

- Préserver le nom « Les Cocottes de Diane », le logo existant et les contenus métier réels.
- Inspirer confiance avec une présence locale, artisanale, chaleureuse et professionnelle.
- Éviter le ton et les conventions visuelles d’une interface SaaS générique.
- Privilégier des formulations utiles, directes et rassurantes plutôt qu’un discours marketing exagéré.
- Préserver les conventions existantes lorsqu’elles facilitent déjà la compréhension et la conversion.

## Evidence on Hand

- Logo principal : `public/logo.svg`, décliné en icônes dans `public/icon.png`, `public/apple-icon.png` et `public/favicon.ico`.
- Données produit et photographies : fournies dynamiquement par l’endpoint `/boutique/articles`; lorsqu’une photographie manque, le logo sert actuellement de visuel de remplacement.
- Points de retrait : fournis par `/commandes/pickup-points`.
- Parcours de commande : `src/components/shop/shop-client.tsx` et `src/components/shop/checkout-client.tsx`.
- Confirmation et suivi : `src/app/success/page.tsx`, `src/app/cancel/page.tsx` et `src/app/suivi/page.tsx`.
- Pages d’information et mentions légales : `src/app/click-and-collect/page.tsx`, `src/app/cgv/page.tsx`, `src/app/confidentialite/page.tsx`, `src/app/cookies/page.tsx` et `src/app/mentions-legales/page.tsx`.
- Les tests Playwright couvrent les catégories, le panier, le choix du retrait, les dates, le checkout et plusieurs états d’erreur.
- Aucun témoignage client, label qualité, récompense ou engagement chiffré n’est fourni par le workspace ; les travaux futurs ne doivent pas en inventer.

## Product Principles

1. **Rendre la prochaine action évidente.** À chaque étape, le client doit comprendre ce qui est disponible, ce qu’il doit choisir et ce qui se passera ensuite.
2. **Faire du retrait une promesse fiable.** Le lieu, la date, l’horaire et la limite de commande doivent être visibles avant le paiement et rappelés après celui-ci.
3. **Montrer la vérité du produit.** Les photographies, prix, allergènes et disponibilités réels priment sur la décoration et les promesses générales.
4. **Réduire l’effort mobile.** Les actions principales, le panier, les quantités et la validation doivent rester rapides et confortables sur un petit écran.
5. **Rassurer par la précision.** Les erreurs, chargements, confirmations et statuts doivent expliquer clairement la situation et la solution possible.

## Accessibility & Inclusion

- L’interface doit rester mobile-first, utilisable au clavier et compatible avec les technologies d’assistance.
- Les cibles interactives principales doivent conserver une taille confortable, des libellés explicites et un focus visible.
- Les informations de prix, stock, allergènes, erreur et confirmation ne doivent pas dépendre de la couleur seule.
- La langue de la page est déclarée en français.
- L’implémentation actuelle contient notamment des labels associés, des textes réservés aux lecteurs d’écran, des régions `aria-live`, des états `aria-expanded` et des tests clavier pour les catégories.
