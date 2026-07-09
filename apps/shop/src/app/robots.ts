import type { MetadataRoute } from 'next'
import {
  getAbsoluteShopUrl,
  isProductionShopIndexable,
} from '@/lib/seo'

export default function robots(): MetadataRoute.Robots {
  if (!isProductionShopIndexable()) {
    return {
      rules: {
        userAgent: '*',
        disallow: '/',
      },
      sitemap: getAbsoluteShopUrl('/sitemap.xml'),
    }
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin',
        '/admin/',
        '/api',
        '/api/',
        '/cancel',
        '/cancel/',
        '/checkout',
        '/checkout/',
        '/paiement',
        '/paiement/',
        '/panier',
        '/panier/',
        '/success',
        '/success/',
        '/suivi',
        '/suivi/',
      ],
    },
    sitemap: getAbsoluteShopUrl('/sitemap.xml'),
  }
}
