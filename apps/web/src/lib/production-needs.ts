import type { Commande, CommandeStatut } from './api'

export type ProductionUrgency = 'urgent' | 'soon' | 'planned' | 'unknown'

export type ProductionNeed = {
  articleId: number
  articleNom: string
  stock: number
  orderedQuantity: number
  quantityToProduce: number
  quantityByCommandeId: Record<number, number>
  dueDate?: string | null
  dueDateKey: string
  commandeIds: number[]
  urgency: ProductionUrgency
}

const productionStatuses = new Set<CommandeStatut>([
  'nouvelle',
  'preparee',
  'paiement_a_verifier',
])

const allocationStatuses = new Set<CommandeStatut>([
  'paiement_en_attente',
  'paiement_a_verifier',
  'nouvelle',
  'preparee',
])

export function getProductionNeeds(commandes: Commande[]): ProductionNeed[] {
  const todayKey = getLocalDateKey(new Date())
  const visibleCommandes = commandes.filter((commande) =>
    productionStatuses.has(commande.statut),
  )
  const hasExplicitProductionData = visibleCommandes.some((commande) =>
    commande.lignes.some((ligne) => ligne.productionQuantity !== undefined),
  )

  if (hasExplicitProductionData) {
    return getExplicitProductionNeeds(visibleCommandes, todayKey)
  }

  const activeCommandes = commandes.filter((commande) =>
    allocationStatuses.has(commande.statut),
  )
  const stockByArticle = new Map<number, number>()
  const articleNameById = new Map<number, string>()
  const linesByArticle = new Map<
    number,
    {
      commandeId: number
      commandeStatut: CommandeStatut
      commandeCreatedAt: string
      commandeDateRetrait?: string | null
      articleId: number
      articleNom: string
      articleStock: number
      quantity: number
    }[]
  >()

  for (const commande of activeCommandes) {
    for (const ligne of commande.lignes) {
      const articleId = ligne.articleId
      const stock = ligne.article.stock

      stockByArticle.set(articleId, stock)
      articleNameById.set(articleId, ligne.article.nom)

      linesByArticle.set(articleId, [
        ...(linesByArticle.get(articleId) ?? []),
        {
          commandeId: commande.id,
          commandeStatut: commande.statut,
          commandeCreatedAt: commande.createdAt,
          commandeDateRetrait: commande.dateRetrait,
          articleId,
          articleNom: ligne.article.nom,
          articleStock: stock,
          quantity: ligne.quantite,
        },
      ])
    }
  }

  const needsByArticleAndDate = new Map<string, ProductionNeed>()

  for (const [articleId, articleLines] of linesByArticle.entries()) {
    const stock = stockByArticle.get(articleId) ?? 0
    const totalOpenQuantity = articleLines.reduce(
      (total, line) => total + line.quantity,
      0,
    )
    let remainingAvailableStock = stock + totalOpenQuantity

    const orderedLines = [...articleLines].sort((a, b) => {
      const dueDateOrder = compareDueDateKeys(
        getDueDateKey(a.commandeDateRetrait),
        getDueDateKey(b.commandeDateRetrait),
      )

      if (dueDateOrder !== 0) {
        return dueDateOrder
      }

      const createdAtOrder =
        new Date(a.commandeCreatedAt).getTime() -
        new Date(b.commandeCreatedAt).getTime()

      if (createdAtOrder !== 0) {
        return createdAtOrder
      }

      return a.commandeId - b.commandeId
    })

    for (const line of orderedLines) {
      const coveredQuantity = Math.min(
        Math.max(0, remainingAvailableStock),
        line.quantity,
      )
      const quantityToProduce = Math.max(0, line.quantity - coveredQuantity)

      remainingAvailableStock = Math.max(
        0,
        remainingAvailableStock - line.quantity,
      )

      if (
        quantityToProduce <= 0 ||
        !productionStatuses.has(line.commandeStatut)
      ) {
        continue
      }

      const dueDateKey = getDueDateKey(line.commandeDateRetrait)
      const key = `${line.articleId}:${dueDateKey}`
      const need =
        needsByArticleAndDate.get(key) ??
        ({
          articleId: line.articleId,
          articleNom: articleNameById.get(articleId) ?? line.articleNom,
          stock: line.articleStock,
          orderedQuantity: 0,
          quantityToProduce: 0,
          quantityByCommandeId: {},
          dueDate: line.commandeDateRetrait,
          dueDateKey,
          commandeIds: [],
          urgency: getUrgency(dueDateKey, todayKey),
        } satisfies ProductionNeed)

      need.stock = Math.min(need.stock, line.articleStock)
      need.orderedQuantity += line.quantity
      need.quantityToProduce += quantityToProduce
      need.quantityByCommandeId[line.commandeId] =
        (need.quantityByCommandeId[line.commandeId] ?? 0) + quantityToProduce

      if (!need.commandeIds.includes(line.commandeId)) {
        need.commandeIds.push(line.commandeId)
        need.commandeIds.sort((a, b) => a - b)
      }

      needsByArticleAndDate.set(key, need)
    }
  }

  return Array.from(needsByArticleAndDate.values()).sort((a, b) => {
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
      const quantityToProduce = need.quantityByCommandeId[commandeId] ?? 0

      if (quantityToProduce <= 0) {
        continue
      }

      result.set(commandeId, [
        ...(result.get(commandeId) ?? []),
        {
          ...need,
          commandeIds: [commandeId],
          quantityToProduce,
        },
      ])
    }
  }

  return result
}

function getExplicitProductionNeeds(
  commandes: Commande[],
  todayKey: string,
): ProductionNeed[] {
  const needsByArticleAndDate = new Map<string, ProductionNeed>()

  for (const commande of commandes) {
    const dueDateKey = getDueDateKey(commande.dateRetrait)

    for (const ligne of commande.lignes) {
      const quantityToProduce = ligne.productionQuantity ?? 0

      if (quantityToProduce <= 0) {
        continue
      }

      const key = `${ligne.articleId}:${dueDateKey}`
      const need =
        needsByArticleAndDate.get(key) ??
        ({
          articleId: ligne.articleId,
          articleNom: ligne.article.nom,
          stock: ligne.article.stock,
          orderedQuantity: 0,
          quantityToProduce: 0,
          quantityByCommandeId: {},
          dueDate: commande.dateRetrait,
          dueDateKey,
          commandeIds: [],
          urgency: getUrgency(dueDateKey, todayKey),
        } satisfies ProductionNeed)

      need.stock = Math.min(need.stock, ligne.article.stock)
      need.orderedQuantity += ligne.quantite
      need.quantityToProduce += quantityToProduce
      need.quantityByCommandeId[commande.id] =
        (need.quantityByCommandeId[commande.id] ?? 0) + quantityToProduce

      if (!need.commandeIds.includes(commande.id)) {
        need.commandeIds.push(commande.id)
        need.commandeIds.sort((a, b) => a - b)
      }

      needsByArticleAndDate.set(key, need)
    }
  }

  return Array.from(needsByArticleAndDate.values()).sort((a, b) => {
    const dateOrder = compareDueDateKeys(a.dueDateKey, b.dueDateKey)

    if (dateOrder !== 0) {
      return dateOrder
    }

    return a.articleNom.localeCompare(b.articleNom, 'fr')
  })
}

function getDueDateKey(date?: string | null) {
  return date ? getLocalDateKey(new Date(date)) : 'unknown'
}

function compareDueDateKeys(dateA: string, dateB: string) {
  if (dateA === 'unknown' && dateB === 'unknown') {
    return 0
  }

  if (dateA === 'unknown') {
    return 1
  }

  if (dateB === 'unknown') {
    return -1
  }

  return dateA.localeCompare(dateB)
}

function getUrgency(dueDateKey: string, todayKey: string): ProductionUrgency {
  if (dueDateKey === 'unknown') {
    return 'unknown'
  }

  const daysUntilDueDate = diffDays(todayKey, dueDateKey)

  if (daysUntilDueDate <= 1) {
    return 'urgent'
  }

  if (daysUntilDueDate <= 3) {
    return 'soon'
  }

  return 'planned'
}

function getLocalDateKey(date: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Europe/Paris',
  }).format(date)
}

function diffDays(fromKey: string, toKey: string) {
  return (toUtcDate(toKey).getTime() - toUtcDate(fromKey).getTime()) / 86_400_000
}

function toUtcDate(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number)

  return new Date(Date.UTC(year, month - 1, day))
}
