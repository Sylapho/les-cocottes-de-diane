import type { Commande, CommandeStatut } from './api'

export type ProductionNeed = {
  articleId: number
  articleNom: string
  stock: number
  dueDate?: string | null
  dueDateKey: string
  quantity: number
  missingTotal: number
  commandeIds: number[]
}

const productionStatuses = new Set<CommandeStatut>([
  'nouvelle',
  'preparee',
  'paiement_a_verifier',
])

export function getProductionNeeds(commandes: Commande[]): ProductionNeed[] {
  const activeCommandes = commandes.filter((commande) =>
    productionStatuses.has(commande.statut),
  )
  const missingByArticle = new Map<number, number>()
  const stockByArticle = new Map<number, number>()
  const articleNameById = new Map<number, string>()
  const demandByArticle = new Map<
    number,
    Map<
      string,
      {
        dueDate?: string | null
        quantity: number
        commandeIds: Set<number>
      }
    >
  >()

  for (const commande of activeCommandes) {
    for (const ligne of commande.lignes) {
      const articleId = ligne.articleId
      const stock = ligne.article.stock

      stockByArticle.set(articleId, stock)
      articleNameById.set(articleId, ligne.article.nom)

      if (stock < 0) {
        missingByArticle.set(articleId, Math.abs(stock))
      }

      const dueDateKey = getDueDateKey(commande.dateRetrait)
      const articleDemand =
        demandByArticle.get(articleId) ??
        new Map<
          string,
          {
            dueDate?: string | null
            quantity: number
            commandeIds: Set<number>
          }
        >()
      const dueDateDemand = articleDemand.get(dueDateKey) ?? {
        dueDate: commande.dateRetrait,
        quantity: 0,
        commandeIds: new Set<number>(),
      }

      dueDateDemand.quantity += ligne.quantite
      dueDateDemand.commandeIds.add(commande.id)
      articleDemand.set(dueDateKey, dueDateDemand)
      demandByArticle.set(articleId, articleDemand)
    }
  }

  const needs: ProductionNeed[] = []

  for (const [articleId, missingTotal] of missingByArticle.entries()) {
    let remaining = missingTotal
    const articleDemand = demandByArticle.get(articleId)

    if (!articleDemand) {
      continue
    }

    const dueDateDemands = Array.from(articleDemand.entries()).sort(
      ([dateA], [dateB]) => compareDueDateKeys(dateA, dateB),
    )

    for (const [dueDateKey, dueDateDemand] of dueDateDemands) {
      if (remaining <= 0) {
        break
      }

      const quantity = Math.min(remaining, dueDateDemand.quantity)

      if (quantity <= 0) {
        continue
      }

      needs.push({
        articleId,
        articleNom: articleNameById.get(articleId) ?? `Article #${articleId}`,
        stock: stockByArticle.get(articleId) ?? 0,
        dueDate: dueDateDemand.dueDate,
        dueDateKey,
        quantity,
        missingTotal,
        commandeIds: Array.from(dueDateDemand.commandeIds).sort(
          (a, b) => a - b,
        ),
      })

      remaining -= quantity
    }
  }

  return needs.sort((a, b) => {
    const dateOrder = compareDueDateKeys(a.dueDateKey, b.dueDateKey)

    if (dateOrder !== 0) {
      return dateOrder
    }

    return a.articleNom.localeCompare(b.articleNom, 'fr')
  })
}

export function getProductionNeedsByCommandeId(needs: ProductionNeed[]) {
  const result = new Map<number, ProductionNeed[]>()

  for (const need of needs) {
    for (const commandeId of need.commandeIds) {
      result.set(commandeId, [...(result.get(commandeId) ?? []), need])
    }
  }

  return result
}

function getDueDateKey(date?: string | null) {
  return date ? new Date(date).toISOString().slice(0, 10) : '9999-12-31'
}

function compareDueDateKeys(dateA: string, dateB: string) {
  return dateA.localeCompare(dateB)
}
