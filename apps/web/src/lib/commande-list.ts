import type { Commande, CommandeStatut } from './api'
import { getLocalDateKey, getPreparationDateOptions } from './preparation'

export const COMMANDES_PAGE_SIZE = 20

export const commandeStatuses: CommandeStatut[] = [
  'paiement_en_attente',
  'nouvelle',
  'preparee',
  'traitee',
  'annulee',
  'paiement_a_verifier',
]

// Orders that still need an action from the team.
export const actionableStatuses = new Set<CommandeStatut>([
  'nouvelle',
  'preparee',
  'paiement_a_verifier',
])

export const commandeTabs = ['all', 'to_prepare', 'ready', 'to_check'] as const

export type CommandeTab = (typeof commandeTabs)[number]

const tabStatuses: Record<Exclude<CommandeTab, 'all'>, CommandeStatut> = {
  to_prepare: 'nouvelle',
  ready: 'preparee',
  to_check: 'paiement_a_verifier',
}

export type CommandeListFilters = {
  tab: CommandeTab
  statut: CommandeStatut | ''
  lieu: string
  date: string
  q: string
  page: number
}

type SearchParams = Record<string, string | string[] | undefined>

export function getSearchParam(params: SearchParams, key: string) {
  const value = params[key]

  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
}

function isCommandeStatut(value: string): value is CommandeStatut {
  return commandeStatuses.includes(value as CommandeStatut)
}

function isCommandeTab(value: string): value is CommandeTab {
  return commandeTabs.includes(value as CommandeTab)
}

export function parseCommandeListFilters(
  params: SearchParams,
): CommandeListFilters {
  const tab = getSearchParam(params, 'tab')
  const statut = getSearchParam(params, 'statut')
  const page = Number.parseInt(getSearchParam(params, 'page'), 10)
  // Older links used separate nom / email / commandeId / dateRetrait params.
  const q =
    getSearchParam(params, 'q') ||
    getSearchParam(params, 'commandeId') ||
    getSearchParam(params, 'nom') ||
    getSearchParam(params, 'email')

  return {
    tab: isCommandeTab(tab) ? tab : 'all',
    statut: isCommandeStatut(statut) ? statut : '',
    lieu: getSearchParam(params, 'lieu'),
    date: getSearchParam(params, 'date') || getSearchParam(params, 'dateRetrait'),
    q: q.trim(),
    page: Number.isInteger(page) && page > 0 ? page : 1,
  }
}

export function resolveDateFilterKey(date: string, now = new Date()) {
  if (!date) {
    return ''
  }

  const options = getPreparationDateOptions(now)

  if (date === 'today') {
    return options.today.dateKey ?? ''
  }

  if (date === 'tomorrow') {
    return options.tomorrow.dateKey ?? ''
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : ''
}

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
}

function matchesSearch(commande: Commande, q: string) {
  if (!q) {
    return true
  }

  const search = normalize(q.replace(/^#/, ''))

  return (
    String(commande.id).includes(search) ||
    normalize(commande.nom).includes(search) ||
    normalize(commande.email).includes(search)
  )
}

export function filterCommandes(
  commandes: Commande[],
  filters: CommandeListFilters,
  now = new Date(),
) {
  const dateKey = resolveDateFilterKey(filters.date, now)

  return commandes.filter((commande) => {
    if (filters.tab !== 'all' && commande.statut !== tabStatuses[filters.tab]) {
      return false
    }

    if (filters.statut && commande.statut !== filters.statut) {
      return false
    }

    if (filters.lieu && commande.lieu !== filters.lieu) {
      return false
    }

    if (dateKey && getLocalDateKey(commande.dateRetrait) !== dateKey) {
      return false
    }

    return matchesSearch(commande, filters.q)
  })
}

export function getCommandeCounts(commandes: Commande[], now = new Date()) {
  const todayKey = getLocalDateKey(now)
  let toPrepare = 0
  let ready = 0
  let toCheck = 0
  let pickupToday = 0
  let quantityToPrepare = 0

  for (const commande of commandes) {
    if (commande.statut === 'nouvelle') {
      toPrepare += 1
      quantityToPrepare += commande.lignes.reduce(
        (total, ligne) => total + ligne.quantite,
        0,
      )
    } else if (commande.statut === 'preparee') {
      ready += 1
    } else if (commande.statut === 'paiement_a_verifier') {
      toCheck += 1
    }

    if (
      commande.statut !== 'annulee' &&
      commande.statut !== 'paiement_en_attente' &&
      getLocalDateKey(commande.dateRetrait) === todayKey
    ) {
      pickupToday += 1
    }
  }

  return {
    all: commandes.length,
    toPrepare,
    ready,
    toCheck,
    pickupToday,
    quantityToPrepare,
  }
}

export function getPickupPoints(commandes: Commande[]) {
  return Array.from(new Set(commandes.map((commande) => commande.lieu))).sort(
    (a, b) => a.localeCompare(b, 'fr'),
  )
}

export function paginate<T>(items: T[], page: number, pageSize: number) {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))
  const currentPage = Math.min(Math.max(1, page), pageCount)
  const startIndex = (currentPage - 1) * pageSize

  return {
    items: items.slice(startIndex, startIndex + pageSize),
    page: currentPage,
    pageCount,
    total: items.length,
    start: items.length === 0 ? 0 : startIndex + 1,
    end: Math.min(startIndex + pageSize, items.length),
  }
}

export function buildCommandesHref(
  filters: CommandeListFilters,
  overrides: Partial<CommandeListFilters> = {},
) {
  const next = { ...filters, page: 1, ...overrides }
  const params = new URLSearchParams()

  if (next.tab !== 'all') params.set('tab', next.tab)
  if (next.statut) params.set('statut', next.statut)
  if (next.lieu) params.set('lieu', next.lieu)
  if (next.date) params.set('date', next.date)
  if (next.q) params.set('q', next.q)
  if (next.page > 1) params.set('page', String(next.page))

  const query = params.toString()

  return query ? `/commandes?${query}` : '/commandes'
}

const shortDateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  timeZone: 'Europe/Paris',
})

const timeFormatter = new Intl.DateTimeFormat('fr-FR', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Paris',
})

// "13 nov. · 09:42"
export function formatOrderDateTime(value: string) {
  const date = new Date(value)

  return `${shortDateFormatter.format(date)} · ${timeFormatter.format(date)}`
}

export function formatOrderTime(value: string) {
  return timeFormatter.format(new Date(value))
}
