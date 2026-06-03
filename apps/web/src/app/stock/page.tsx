import StockDashboard from '@/components/stock/stock-dashboard'
import {
  getArticles,
  getMatieresPremieres,
  getMouvementsStock,
  getStockLots,
} from '@/lib/api'

export default async function StockPage() {
  const [articles, matieres, mouvements, lots] = await Promise.all([
    getArticles(),
    getMatieresPremieres(),
    getMouvementsStock(),
    getStockLots(),
  ])

  return (
    <StockDashboard
      articles={articles}
      matieres={matieres}
      mouvements={mouvements}
      lots={lots}
    />
  )
}
