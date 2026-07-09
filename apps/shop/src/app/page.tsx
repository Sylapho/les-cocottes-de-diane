import ShopClient from '@/components/shop/shop-client'
import { getPickupPoints, getShopArticles } from '@/lib/api'
import {
  defaultSeoDescription,
  defaultSeoTitle,
  getAbsoluteShopUrl,
  getJsonLdScript,
  siteName,
} from '@/lib/seo'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: {
    absolute: defaultSeoTitle,
  },
  description: defaultSeoDescription,
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: defaultSeoTitle,
    description: defaultSeoDescription,
    url: getAbsoluteShopUrl('/'),
  },
}

export default async function Home() {
  const [articles, pickupPoints] = await Promise.all([
    getShopArticles(),
    getPickupPoints(),
  ])

  const localBusinessJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: siteName,
    url: getAbsoluteShopUrl('/'),
    image: getAbsoluteShopUrl('/logo.svg'),
    email: 'contact@lescocottesdediane.fr',
    telephone: '+33770158302',
    address: {
      '@type': 'PostalAddress',
      streetAddress: '46 Rue de la Muette',
      postalCode: '27490',
      addressLocality: 'Clef Vallee d Eure',
      addressCountry: 'FR',
    },
    areaServed: 'Eure, France',
    makesOffer: {
      '@type': 'Offer',
      itemOffered: {
        '@type': 'Service',
        name: 'Commande alimentaire en Click & Collect',
      },
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={getJsonLdScript(localBusinessJsonLd)}
      />
      <ShopClient articles={articles} pickupPoints={pickupPoints} />
    </>
  )
}
