import ShopClient from '@/components/shop/shop-client'
import { getApiUrl, getShopArticles } from '@/lib/api'

export const dynamic = 'force-dynamic'

type HomeProps = {
  searchParams: Promise<{
    payment?: string
  }>
}

export default async function Home({ searchParams }: HomeProps) {
  const articles = await getShopArticles()
  const { payment } = await searchParams

  return (
    <ShopClient
      articles={articles}
      apiUrl={getApiUrl()}
      paymentStatus={payment === 'success' || payment === 'cancelled' ? payment : null}
    />
  )
}
