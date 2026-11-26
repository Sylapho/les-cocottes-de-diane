// Central storefront routes. The catalogue and cart entries move to /boutique
// and /panier with the next redesign lots.
export const shopRoutes = {
  home: '/',
  catalogue: '/#produits',
  cart: '/',
  checkout: '/checkout',
  pickup: '/click-and-collect',
  tracking: '/suivi',
} as const

export const contactEmail = 'contact@lescocottesdediane.fr'

export const mainNavigation = [
  { href: shopRoutes.catalogue, label: 'La boutique', match: '/' },
  { href: shopRoutes.pickup, label: 'Comment retirer ?', match: shopRoutes.pickup },
  { href: shopRoutes.tracking, label: 'Suivre ma commande', match: shopRoutes.tracking },
] as const
