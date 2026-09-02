---
name: "Les Cocottes de Diane — Boutique"
description: "Un comptoir local chaleureux et direct pour commander rapidement en Click & Collect."
colors:
  brand-wine: "#5a0037"
  brand-magenta: "#b5006e"
  brand-magenta-deep: "#8c0055"
  ink: "#181014"
  body: "#4a3d43"
  muted: "#7a6d73"
  canvas: "#faf7f8"
  surface: "#ffffff"
  surface-soft: "#fffafb"
  surface-tint: "#fceef6"
  border: "#eee2e7"
  border-strong: "#e8e1e4"
  border-tint: "#f0dbe6"
  warm-highlight: "#fde68a"
typography:
  display:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 900
    lineHeight: 1.111
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 900
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 900
    lineHeight: 1.4
  body:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.75
  action:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 700
    lineHeight: 1.25
  eyebrow:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 900
    lineHeight: 1.25
    letterSpacing: "0.22em"
rounded:
  control: "16px"
  card: "24px"
  panel: "28px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
  3xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.brand-magenta}"
    textColor: "{colors.surface}"
    typography: "{typography.action}"
    rounded: "{rounded.pill}"
    padding: "12px 24px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.brand-magenta-deep}"
    textColor: "{colors.surface}"
    typography: "{typography.action}"
    rounded: "{rounded.pill}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.brand-wine}"
    typography: "{typography.action}"
    rounded: "{rounded.pill}"
    padding: "12px 24px"
    height: "44px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.action}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "48px"
  search-input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.action}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "44px"
  chip-selected:
    backgroundColor: "{colors.brand-magenta}"
    textColor: "{colors.surface}"
    typography: "{typography.action}"
    rounded: "{rounded.pill}"
    padding: "8px 16px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "20px"
---

# Design System: Les Cocottes de Diane — Boutique

## Overview

**Creative North Star: "Le comptoir local"**

La boutique doit donner l’impression d’un comptoir de proximité bien tenu : les produits, les prix et le retrait sont au premier plan ; la marque apporte la chaleur et la reconnaissance ; l’interface reste simple, directe et professionnelle. L’identité existante s’appuie sur un bordeaux profond, un magenta franc, des blancs légèrement rosés, des formes généreusement arrondies et une typographie très affirmée.

Cette expression ne doit pas dériver vers un tableau de bord SaaS, un catalogue de cartes décoratives ou une page publicitaire surchargée. La personnalité vient du logo, des photographies réelles, du langage local et du soin porté aux détails fonctionnels. Le mode de la boutique est avant tout **Operate** : aider le client à accomplir une commande ; les moments de persuasion restent courts et factuels.

**Key Characteristics:**

- Hiérarchie forte et immédiatement lisible.
- Palette bordeaux, magenta et blanc rosé issue de l’interface existante.
- Photographies réelles des produits comme preuve principale.
- Actions en pilules, surfaces calmes et panneaux aux coins souples.
- Parcours mobile-first avec panier et total toujours faciles à retrouver.
- États de disponibilité, retrait, paiement et suivi formulés sans ambiguïté.

## Colors

La palette associe un ancrage bordeaux sombre à un accent magenta énergique, sur des surfaces blanches ou rosées très claires. Les valeurs normatives figurent dans le frontmatter.

### Primary

- **Bordeaux de l’enseigne** (`brand-wine`) : ancre la navigation et les zones de marque qui doivent inspirer stabilité.
- **Magenta commande** (`brand-magenta`) : réservé aux actions principales, prix, repères de section et états sélectionnés.
- **Magenta pressé** (`brand-magenta-deep`) : état de survol ou d’accent renforcé, jamais une deuxième couleur d’action concurrente.

### Neutral

- **Encre prune** (`ink`) : titres, totaux et informations décisives.
- **Texte cacao** (`body`) : texte courant et détails produit importants.
- **Taupe sourd** (`muted`) : explications secondaires, horaires et métadonnées ; ne pas l’utiliser pour une information critique.
- **Toile rosée** (`canvas`) : fond principal de la boutique.
- **Blanc comptoir** (`surface`) : panneaux et champs.
- **Porcelaine chaude** (`surface-soft`) : en-têtes de groupes et départ de certains fonds utilitaires.
- **Rose papier** (`surface-tint`) : aide contextuelle, sélection légère et regroupement fonctionnel.
- **Traits poudrés** (`border`, `border-strong`, `border-tint`) : séparation discrète des surfaces et contrôles.
- **Or chaud** (`warm-highlight`) : petit accent de marque déjà présent dans le nom de Diane ; usage rare.

**The One Action Color Rule.** Le magenta porte l’action et la sélection. Ne pas introduire une autre couleur vive pour une action de même priorité.

**The Status Is More Than Color Rule.** Une rupture, une erreur ou une confirmation conserve toujours un libellé explicite et, si nécessaire, une icône ou une structure distincte.

## Typography

**Display Font:** Arial (avec Helvetica puis sans-serif en repli)  
**Body Font:** Arial (avec Helvetica puis sans-serif en repli)

**Character:** la typographie effectivement rendue est sans-serif, dense et très contrastée. Les titres utilisent un noir typographique marqué ; les textes d’accompagnement restent simples et généreusement interlignés.

### Hierarchy

- **Display** (900, `display`, 1.111) : titre de page ou message principal ; passe à 3rem à partir du breakpoint `sm`.
- **Headline** (900, `headline`, 1.2) : titre de catalogue ou de grand bloc.
- **Title** (900, `title`, 1.4) : sections, panneaux, catégories et récapitulatifs.
- **Body** (400, `body`, 1.75) : explications et descriptions, idéalement limitées à environ 65 caractères par ligne dans les zones de lecture.
- **Action** (700, `action`, 1.25) : boutons, filtres et contrôles.
- **Eyebrow** (900, `eyebrow`, espacement 0.22em) : repère court au-dessus d’un titre, en capitales ; une seule ligne.

**The Clarity Before Flourish Rule.** Les prix, dates, stocks et libellés d’action n’utilisent jamais une police décorative.

**The Font Authority Warning.** `Inter` et `Playfair Display` sont chargées dans le layout, mais les styles calculés de l’interface observée utilisent Arial et aucun composant ne référence Playfair. Arial reste donc la vérité documentée tant que cette divergence n’est pas résolue explicitement.

## Layout

Le système est mobile-first. Les écrans utilisent une gouttière latérale de 16px et un conteneur principal d’environ 1152px (`max-w-6xl`). Le rythme courant progresse par 4px et utilise surtout 8, 12, 16, 20, 24 et 32px.

Sur mobile, le contenu forme une colonne continue : actions principales pleine largeur, filtres horizontaux défilants, groupes de produits compacts et panier accessible en bas de l’écran lorsqu’il contient des articles. À partir de `sm` (640px), certaines actions et grilles passent sur deux ou trois colonnes. À partir de `lg` (1024px), les pages produit, checkout, confirmation et suivi utilisent une composition principale + panneau secondaire, avec récapitulatif collant lorsque c’est utile.

Le catalogue préfère des lignes produit compactes à une grille de grandes cartes. Cette densité permet de comparer rapidement nom, description, informations, prix et quantité sans perdre le contexte de catégorie.

**The Conversion Path Rule.** Sur petit écran, le prix, l’action d’ajout, la quantité, le total et l’accès au panier ne doivent jamais être relégués derrière une information décorative.

**The One Surface, One Purpose Rule.** Un panneau regroupe une tâche cohérente. Éviter les cartes imbriquées lorsque bordure, espace ou séparateur suffisent à exprimer la structure.

## Elevation & Depth

Le système est plat par défaut et utilise surtout des différences de ton, des bordures poudrées et un faible relief. L’ombre légère accompagne les surfaces fonctionnelles importantes ; les ombres fortes sont réservées aux couches qui survolent réellement la page, comme le tiroir de panier ou l’action mobile fixe.

### Shadow Vocabulary

- **Repos discret** (`shadow-sm`) : double ombre de 0 1px 3px / 0 1px 2px avec 10 % de noir, pour panneaux, champs et actions principales.
- **Action mobile** (`shadow-lg`) : relief plus lisible pour le bouton de panier fixé au bas de l’écran.
- **Couche superposée** (`shadow-xl`) : tiroir du panier uniquement.
- **Focus de marque** : halo magenta translucide de 3px dans les styles globaux ; le checkout complète ce traitement par une bordure magenta et un anneau rose.

**The Semantic Elevation Rule.** Une ombre signifie qu’un élément doit ressortir ou survoler ; elle ne sert pas à décorer chaque conteneur.

## Shapes

Les actions, filtres, badges et contrôles de quantité utilisent la pilule complète. Les champs du checkout et les petits conteneurs utilisent des angles de 16px. Les sections principales et groupes de produits utilisent 24px ; les grands panneaux de confirmation ou de suivi peuvent atteindre 28px.

Les photographies sont recadrées en `object-cover` dans des cadres arrondis. Le logo est utilisé en remplacement lorsqu’aucune image produit n’est disponible, mais ce remplacement ne doit pas devenir le visuel dominant du catalogue.

**The Soft, Not Puffy Rule.** Les coins sont accueillants, mais les épaisseurs, espacements et ombres restent retenus. Ne pas empiler plusieurs silhouettes arrondies autour de la même information.

## Components

### Buttons

- **Shape:** pilule complète, hauteur minimale de 44px et libellé gras.
- **Primary:** magenta sur blanc, padding courant de 12px × 24px ; largeur complète sur mobile lorsque l’action conclut une étape.
- **Hover / Focus:** magenta profond au survol ; focus visible magenta/rose ; l’état désactivé reste lisible et ne repose pas uniquement sur l’opacité.
- **Secondary:** blanc, texte bordeaux et bordure poudrée ; la bordure devient magenta au survol.
- **Motion:** transitions d’état courtes. Les effets d’échelle existants sur l’ajout produit restent subtils et ne se propagent pas aux actions de paiement.

### Chips

- **Style:** pilules compactes, magenta sur blanc lorsque sélectionnées ; blanc, texte cacao et bordure poudrée au repos.
- **State:** le texte et le contraste expriment clairement le filtre sélectionné ; la rangée peut défiler horizontalement sur mobile.

### Cards / Containers

- **Corner Style:** 24px pour les groupes et sections principales, 16px pour les éléments internes.
- **Background:** blanc sur toile rosée ; rose papier pour l’aide contextuelle.
- **Shadow Strategy:** plat ou `shadow-sm` seulement lorsque le panneau doit se détacher.
- **Border:** trait poudré de 1px.
- **Internal Padding:** 16 à 24px selon l’importance et la largeur.

### Inputs / Fields

- **Style:** fond blanc, texte encre, bordure poudrée, hauteur de 44 à 48px ; recherche en pilule, champs de checkout à 16px.
- **Focus:** bordure magenta et halo rose ou halo global magenta translucide.
- **Error / Disabled:** message textuel à proximité, ton rouge réservé au problème, action de résolution proposée lorsque possible.

### Navigation

La navigation principale est un bandeau bordeaux collant avec logo, nom de la marque et accès direct au panier. Les liens secondaires sont masqués sur mobile pour préserver la priorité du panier. Les pages profondes utilisent un retour à la boutique sous forme de pilule rose pâle.

### Product Row

La ligne produit associe une vignette réelle de 72px, le nom, une description courte, les allergènes ou ingrédients repliables, le prix et l’action d’ajout. Sur mobile, le prix et la quantité restent alignés dans une rangée dédiée. Une fiche produit peut approfondir l’information, mais l’ajout rapide reste possible depuis le catalogue.

### Cart Drawer

Le panier occupe toute la largeur sur petit écran et au plus 448px sur grand écran. Il présente les lignes, quantités, suppression, total et prochaine étape. Le fond obscurci et l’ombre forte sont réservés à cette couche.

### Pickup Choice

Les points de retrait sont des contrôles de sélection explicites avec libellé et horaire. La date compatible est proposée après le lieu, accompagnée de la règle de commande avant 14 h. Le récapitulatif rappelle lieu, horaire, date et total avant paiement.

## Do's and Don'ts

### Do:

- **Do** montrer les photographies réelles disponibles et réserver le logo au remplacement d’une image absente.
- **Do** placer prix, disponibilité, allergènes et action d’ajout dans le premier niveau de lecture.
- **Do** garder les actions principales magenta, les actions secondaires blanches et les zones de marque bordeaux.
- **Do** conserver des cibles tactiles d’au moins 44px et un focus visible.
- **Do** utiliser les états de chargement, d’erreur et de confirmation déjà prévus par le produit, avec une formulation directe.
- **Do** rappeler le lieu, la date et le total avant de quitter la boutique pour Stripe.

### Don't:

- **Don't** transformer le catalogue en grille de cartes SaaS uniformes ou multiplier les cartes imbriquées.
- **Don't** ajouter de dégradés génériques, d’illustrations artificielles ou d’ornements qui concurrencent les produits.
- **Don't** masquer un prix, une indisponibilité, un allergène ou une erreur derrière un popover obligatoire ou une couleur seule.
- **Don't** utiliser d’animations longues, rebondissantes ou décoratives pendant l’ajout, le checkout ou le paiement.
- **Don't** remplacer les contenus réels par des accroches marketing vagues, des preuves inventées ou des promesses non vérifiées.
- **Don't** appliquer une refonte purement esthétique si elle augmente le nombre d’étapes ou diminue la lisibilité mobile.
