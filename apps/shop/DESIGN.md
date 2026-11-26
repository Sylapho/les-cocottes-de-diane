---
name: "Les Cocottes de Diane — Boutique"
description: "Une épicerie éditoriale, chaleureuse et directe : choisir en ligne, retirer près de chez soi."
source: "Figma « Les Cocottes de Diane — Front Office Redesign » (pages Creative Direction et Design System)"
colors:
  ink: "#49263c"
  muted: "#735e6b"
  raspberry: "#d8166a"
  raspberry-dark: "#af1055"
  blush: "#fbe2ed"
  sand: "#f3e8ee"
  cream: "#fff7fb"
  paper: "#ffffff"
  line: "#dcc6d1"
  error: "#9c2b24"
typography:
  h1:
    fontFamily: "DM Serif Display"
    fontSize: "3.5rem"
    fontWeight: 400
    lineHeight: "3.875rem"
  h2:
    fontFamily: "DM Serif Display"
    fontSize: "2.5rem"
    fontWeight: 400
    lineHeight: "2.875rem"
  body:
    fontFamily: "DM Sans"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: "1.5625rem"
  small:
    fontFamily: "DM Sans"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: "1.3125rem"
  label:
    fontFamily: "DM Sans"
    fontSize: "0.875rem"
    fontWeight: 700
    lineHeight: "1.25rem"
rounded:
  badge: "4px"
  control: "8px"
  card: "8px"
  chip: "9999px"
spacing:
  scale: [4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96]
components:
  button-primary:
    backgroundColor: "{colors.raspberry}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "16px"
    height: "52px"
  button-primary-hover:
    backgroundColor: "{colors.raspberry-dark}"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    border: "1px {colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
  button-tertiary:
    textColor: "{colors.ink}"
    typography: "{typography.label}"
  button-disabled:
    backgroundColor: "{colors.sand}"
    textColor: "{colors.muted}"
  field:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    border: "1px {colors.muted}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "16px"
  chip:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.chip}"
    padding: "12px 24px"
  chip-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  feedback:
    backgroundColor: "{colors.blush}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "16px"
---

# Design System: Les Cocottes de Diane — Boutique

## Overview

**Direction : « Le goût des choses simples. »**

Une boutique de proximité avec un vrai goût du détail : une épicerie éditoriale, chaleureuse et expressive, ancrée dans le rose framboise du logo de Diane. Le blanc rosé, le rose poudré et le prune sombre équilibrent la personnalité de la marque et la lisibilité.

Le mode reste avant tout fonctionnel : choisir, payer, retirer. Les titres en serif portent la voix ; les prix, dates et informations pratiques restent en sans-serif et se lisent sans effort. Le site parle directement des besoins du client, jamais de l'interface (« expérience courte, élégante » est à proscrire).

La source de vérité visuelle est le fichier Figma « Front Office Redesign ». Les tokens sont déclarés dans `src/app/globals.css` (`@theme`) et les composants de base vivent dans `src/components/ui/`.

**Key Characteristics:**

- Titres DM Serif Display, texte DM Sans.
- Une seule couleur d'action : le framboise.
- Surfaces plates, rayons de 8px, aucune ombre décorative.
- Photographies réelles des produits comme preuve principale.
- Aucune règle métier inventée : retrait uniquement, pas de compte client, paiement Stripe externe.

## Colors

Les valeurs normatives figurent dans le frontmatter et dans `@theme` (`bg-ink`, `text-muted`, `bg-raspberry`…).

| Token | Nom Figma affiché | Variable Figma | Usage |
| --- | --- | --- | --- |
| `ink` | Prune | `color-ink` | Titres, texte principal, bordures de bouton secondaire, chip sélectionné, focus |
| `muted` | — | `color-muted` | Texte secondaire, bordure de champ, libellés désactivés |
| `raspberry` | Framboise | `color-red` | Action principale uniquement |
| `raspberry-dark` | — | `color-redDark` | Survol de l'action principale |
| `blush` | Rose poudré | `color-sage` | Bandeaux de service, feedback info/succès, badge disponible |
| `sand` | — | `color-sand` | Fond désactivé, badge indisponible/en attente, placeholders photo |
| `cream` | Blanc rosé | `color-cream` | Fond de page, chip au repos, feedback d'erreur |
| `paper` | Blanc | `color-paper` | Champs, panneaux, cartes |
| `line` | — | `color-line` | Bordures décoratives (contrôle de quantité, listes) |
| `error` | — | `color-error` | Messages et bordures d'erreur |

Les noms de variables Figma (`red`, `sage`, `cream`…) sont hérités d'une ancienne palette ; le code utilise les noms de la colonne « Token ».

**The One Action Color Rule.** Le framboise porte l'action principale. Ne pas l'utiliser pour du texte courant ni introduire une autre couleur vive de même priorité.

**The Status Is More Than Color Rule.** Une rupture, une erreur ou une confirmation conserve toujours un libellé explicite et, si nécessaire, une icône.

### Contrastes mesurés (Figma)

- Texte prune / blanc rosé : 12.27:1
- Texte secondaire / blanc rosé : 5.63:1
- Texte blanc / framboise : 4.95:1
- Texte prune / rose poudré : 10.58:1
- Bordure fonctionnelle / blanc : 5.93:1

## Typography

**Display Font:** DM Serif Display (400), chargée via `next/font` (`--font-dm-serif`, utilitaire `font-serif`)
**Body Font:** DM Sans, chargée via `next/font` (`--font-dm-sans`, utilitaire `font-sans`, police par défaut)

### Hierarchy

- **H1** (`text-h1`, 56/62, serif) : titre de page desktop. Sur mobile, les titres de page passent à 40/46 (`text-h2`).
- **H2** (`text-h2`, 40/46, serif) : titres de section.
- **Body** (`text-body`, 16/25) : texte courant, prix, informations métier.
- **Small** (`text-small`, 14/21) : texte secondaire, badges, aides.
- **Label** (`text-label`, 14/20, bold) : libellés de champs, boutons, chips.
- **Eyebrow** : label en capitales, framboise, au-dessus d'un titre de page.

**The Clarity Before Flourish Rule.** Les prix, dates, stocks et libellés d'action n'utilisent jamais la serif.

## Layout

- **Desktop 1440** : marges 80px, contenu 1280px, grille 12 colonnes, gouttières 24–32px.
- **Mobile 390** : marges 20px, contenu 350px, grille 4 colonnes ; cartes produit en 2 colonnes de 171px avec gouttière 8px.
- **Espacements** : 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96.
- Les catégories défilent horizontalement sur mobile.
- Pages de commande : formulaire + récapitulatif latéral (432px) sur desktop, empilés sur mobile.

**The Conversion Path Rule.** Sur petit écran, le prix, l'ajout, la quantité, le total et l'accès au panier ne sont jamais relégués derrière une information décorative.

## Elevation & Depth

Pas d'ombre décorative. La hiérarchie passe par le contraste de surface (blanc rosé / blanc / rose poudré / prune) et des bordures de 1px. Seules les couches qui survolent réellement la page (tiroir panier, menu mobile) peuvent porter une ombre.

## Shapes

- 8px pour les contrôles, champs, boutons, cartes et panneaux.
- 4px pour les badges de disponibilité.
- Pilule complète pour les chips de catégorie uniquement.
- Bordure 1px.

## Components

Composants de base dans `src/components/ui/` :

- **`Button` / `ButtonLink`** : `appearance` `primary` | `secondary` | `tertiary`, hauteur minimale 48px (52px rendu). `loading` garde les couleurs normales et affiche « Chargement… ». Désactivé : fond sable, texte atténué.
- **`Field`** : libellé permanent au-dessus, bordure atténuée, focus prune, erreur textuelle liée par `aria-describedby`.
- **`Select`** : `<select>` natif stylé comme `Field`, chevron décoratif. La liste ouverte reste celle du navigateur.
- **`CategoryChip`** : bouton `aria-pressed`, prune quand sélectionné, focus framboise.
- **`AvailabilityBadge`** : `available` (rose poudré), `unavailable` et `pending` (sable).
- **`QuantityControl`** : trois zones de 48px, bordure `line`, boutons désactivables aux bornes.
- **`Feedback`** : `info` / `success` sur rose poudré, `error` en texte erreur sur blanc rosé ; `live` pour l'annoncer aux lecteurs d'écran.

Icônes : `lucide-react`, trait fin, toujours `aria-hidden` lorsqu'un texte accompagne l'icône.

Les composants d'écran (en-tête, pied de page, carte produit, ligne de panier, tiroir, progression de commande) arrivent avec les lots suivants de la refonte.

## Do's and Don'ts

### Do:

- **Do** montrer les photographies réelles des produits ; les visuels d'ambiance générés restent provisoires et doivent être remplacés.
- **Do** garder un focus visible (contour prune 3px) et des cibles tactiles d'au moins 44px.
- **Do** cacher une section produit (ingrédients, allergènes…) quand la donnée est absente plutôt qu'afficher un texte vide.
- **Do** rappeler le lieu, la date et le total avant de quitter la boutique pour Stripe.
- **Do** contrôler WCAG 2.2 AA / RGAA : ordre de lecture, clavier, messages annoncés, textes alternatifs, reflow à 200 %.

### Don't:

- **Don't** ajouter d'ombres, de dégradés ou d'ornements qui concurrencent les produits.
- **Don't** utiliser la serif pour un prix, une date ou un libellé d'action.
- **Don't** décrire l'interface dans les textes ; parler de ce que le client fait (choisir, payer, retirer).
- **Don't** inventer de statut de commande, de promotion, de livraison ou de compte client.
- **Don't** masquer un prix, une indisponibilité, un allergène ou une erreur derrière une couleur seule.
