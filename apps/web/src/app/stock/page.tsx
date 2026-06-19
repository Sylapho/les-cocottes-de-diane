import StockDashboard from '@/components/stock/stock-dashboard'
import {
  getArticles,
  getMatieresPremieres,
  getMouvementsStock,
  getStockLots,
} from '@/lib/api'
import { requireUiPermission } from '@/lib/auth-session'
import {
  canManageArticleProduction,
  canManageStock,
  canViewStock,
} from '@/lib/permissions'

export default async function StockPage() {
  const session = await requireUiPermission(canViewStock)
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
      canManageStock={canManageStock(session.user)}
      canProduceArticles={canManageArticleProduction(session.user)}
    />
  )
}
