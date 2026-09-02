import CheckoutClient from '@/components/shop/checkout-client'
import { getApiUrl, getPickupPoints, getShopArticles } from '@/lib/api'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Paiement',
  robots: {
    index: false,
    follow: false,
  },
}

export default async function CheckoutPage() {
  const [articles, pickupPoints] = await Promise.all([
    getShopArticles(),
    getPickupPoints(),
  ])

  return (
    <CheckoutClient
      articles={articles}
      apiUrl={getApiUrl()}
      initialNow={new Date().toISOString()}
      pickupPoints={pickupPoints}
    />
  )
}
