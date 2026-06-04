import CheckoutClient from '@/components/shop/checkout-client'
import { getApiUrl, getShopArticles } from '@/lib/api'

export const dynamic = 'force-dynamic'

export default async function CheckoutPage() {
  const articles = await getShopArticles()

  return <CheckoutClient articles={articles} apiUrl={getApiUrl()} />
}