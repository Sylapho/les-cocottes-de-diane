import test from 'node:test'
import assert from 'node:assert/strict'
import type { Commande, CommandeStatut } from './api'
import {
  buildCommandesHref,
  filterCommandes,
  getCommandeCounts,
  paginate,
  parseCommandeListFilters,
} from './commande-list'

const now = new Date('2026-11-13T09:00:00.000Z')

function makeCommande(
  id: number,
  statut: CommandeStatut,
  overrides: Partial<Commande> = {},
): Commande {
  return {
    id,
    nom: `Client ${id}`,
    email: `client${id}@example.com`,
    totalTtcCents: 1000,
    lieu: 'Atelier',
    dateRetrait: '2026-11-13T10:00:00.000Z',
    statut,
    createdAt: '2026-11-12T08:00:00.000Z',
    lignes: [
      {
        id: id * 10,
        commandeId: id,
        articleId: 1,
        quantite: 2,
        prixUnitCents: 500,
        article: {
          id: 1,
          nom: 'Velouté',
          prixCents: 500,
          tvaBps: 550,
          stock: 10,
          online: true,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      },
    ],
    ...overrides,
  }
}

const commandes = [
  makeCommande(1, 'nouvelle'),
  makeCommande(2, 'nouvelle', { lieu: 'Marché', nom: 'Léa Petit' }),
  makeCommande(3, 'preparee'),
  makeCommande(4, 'paiement_a_verifier'),
  makeCommande(5, 'traitee', { dateRetrait: '2026-11-14T10:00:00.000Z' }),
  makeCommande(6, 'annulee'),
]

test('counts orders by operational state', () => {
  assert.deepEqual(getCommandeCounts(commandes, now), {
    all: 6,
    toPrepare: 2,
    ready: 1,
    toCheck: 1,
    pickupToday: 4,
    quantityToPrepare: 4,
  })
})

test('parses filters and keeps legacy search params working', () => {
  const filters = parseCommandeListFilters({
    tab: 'ready',
    commandeId: '#42',
    dateRetrait: '2026-11-13',
    page: '3',
  })

  assert.equal(filters.tab, 'ready')
  assert.equal(filters.q, '#42')
  assert.equal(filters.date, '2026-11-13')
  assert.equal(filters.page, 3)
  assert.equal(parseCommandeListFilters({ tab: 'nope' }).tab, 'all')
  assert.equal(parseCommandeListFilters({ page: '-2' }).page, 1)
})

test('filters by tab, pickup point, date and accent-insensitive search', () => {
  const base = parseCommandeListFilters({})

  assert.deepEqual(
    filterCommandes(commandes, { ...base, tab: 'to_prepare' }, now).map(
      (commande) => commande.id,
    ),
    [1, 2],
  )
  assert.deepEqual(
    filterCommandes(commandes, { ...base, lieu: 'Marché' }, now).map(
      (commande) => commande.id,
    ),
    [2],
  )
  assert.deepEqual(
    filterCommandes(commandes, { ...base, date: 'tomorrow' }, now).map(
      (commande) => commande.id,
    ),
    [5],
  )
  assert.deepEqual(
    filterCommandes(commandes, { ...base, q: 'lea' }, now).map(
      (commande) => commande.id,
    ),
    [2],
  )
  assert.deepEqual(
    filterCommandes(commandes, { ...base, q: '#4' }, now).map(
      (commande) => commande.id,
    ),
    [4],
  )
})

test('paginates and clamps the requested page', () => {
  const result = paginate([1, 2, 3, 4, 5], 9, 2)

  assert.deepEqual(result.items, [5])
  assert.equal(result.page, 3)
  assert.equal(result.start, 5)
  assert.equal(result.end, 5)
  assert.equal(paginate([], 1, 20).start, 0)
})

test('builds list hrefs and resets the page when a filter changes', () => {
  const filters = parseCommandeListFilters({ q: 'lea', page: '2' })

  assert.equal(
    buildCommandesHref(filters, { tab: 'ready' }),
    '/commandes?tab=ready&q=lea',
  )
  assert.equal(buildCommandesHref(filters, { page: 2 }), '/commandes?q=lea&page=2')
})
