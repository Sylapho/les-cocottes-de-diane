import StockDashboard from '@/components/stock/stock-dashboard'
import { getArticles, getMatieresPremieres, getMouvementsStock } from '@/lib/api'

export default async function StockPage() {
  const [articles, matieres, mouvements] = await Promise.all([
    getArticles(),
    getMatieresPremieres(),
    getMouvementsStock(),
  ])

  return (
    <StockDashboard
      articles={articles}
      matieres={matieres}
      mouvements={mouvements}
    />
  )
}
