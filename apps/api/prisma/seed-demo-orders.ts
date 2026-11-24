import 'dotenv/config'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from './generated/prisma/client'

// Local-only demo orders for back-office development.
// Re-runnable: it only replaces orders whose trackingToken starts with
// DEMO_TOKEN_PREFIX, and never touches accounts, catalogue or real orders.
// Stock is reserved like a real checkout so cancelling a demo order from the
// back-office (which restores reserved stock) keeps article stock consistent.
// Demo orders have no Stripe payment: refunds stay disabled on them.

const DEMO_TOKEN_PREFIX = 'demo-order-'
const LOCAL_HOSTS = ['localhost', '127.0.0.1', '::1']

type DemoStatus =
  'nouvelle' | 'preparee' | 'traitee' | 'annulee' | 'paiement_a_verifier'

type DemoOrderSpec = {
  status: DemoStatus
  // Days from today; null means no pickup date.
  pickupInDays: number | null
  createdHoursAgo: number
}

const customers = [
  ['Camille Martin', '06 12 34 56 78'],
  ['Thomas Bernard', null],
  ['Léa Petit', '07 23 45 67 89'],
  ['Hugo Laurent', '06 34 56 78 90'],
  ['Emma Robert', null],
  ['Lucas Moreau', '06 45 67 89 01'],
  ['Chloé Simon', '07 56 78 90 12'],
  ['Alice Dubois', null],
  ['Nathan Michel', '06 67 89 01 23'],
  ['Manon Lefebvre', '07 78 90 12 34'],
  ['Jules Garcia', null],
  ['Inès Roux', '06 89 01 23 45'],
  ['Louis Fournier', '07 90 12 34 56'],
  ['Zoé Girard', null],
  ['Gabriel Bonnet', '06 01 23 45 67'],
] as const

const specs: DemoOrderSpec[] = [
  // To prepare: today, tomorrow, later and without date.
  { status: 'nouvelle', pickupInDays: 0, createdHoursAgo: 2 },
  { status: 'nouvelle', pickupInDays: 0, createdHoursAgo: 3 },
  { status: 'nouvelle', pickupInDays: 0, createdHoursAgo: 5 },
  { status: 'nouvelle', pickupInDays: 0, createdHoursAgo: 20 },
  { status: 'nouvelle', pickupInDays: 1, createdHoursAgo: 1 },
  { status: 'nouvelle', pickupInDays: 1, createdHoursAgo: 8 },
  { status: 'nouvelle', pickupInDays: 1, createdHoursAgo: 26 },
  { status: 'nouvelle', pickupInDays: 3, createdHoursAgo: 4 },
  { status: 'nouvelle', pickupInDays: 5, createdHoursAgo: 30 },
  { status: 'nouvelle', pickupInDays: null, createdHoursAgo: 50 },
  // Ready for pickup.
  { status: 'preparee', pickupInDays: 0, createdHoursAgo: 28 },
  { status: 'preparee', pickupInDays: 0, createdHoursAgo: 33 },
  { status: 'preparee', pickupInDays: 0, createdHoursAgo: 40 },
  { status: 'preparee', pickupInDays: 1, createdHoursAgo: 45 },
  { status: 'preparee', pickupInDays: 2, createdHoursAgo: 52 },
  // Payment to check.
  { status: 'paiement_a_verifier', pickupInDays: 1, createdHoursAgo: 6 },
  { status: 'paiement_a_verifier', pickupInDays: 2, createdHoursAgo: 27 },
  // Done and cancelled, in the past.
  { status: 'traitee', pickupInDays: 0, createdHoursAgo: 48 },
  { status: 'traitee', pickupInDays: -1, createdHoursAgo: 60 },
  { status: 'traitee', pickupInDays: -1, createdHoursAgo: 70 },
  { status: 'traitee', pickupInDays: -2, createdHoursAgo: 80 },
  { status: 'traitee', pickupInDays: -4, createdHoursAgo: 120 },
  { status: 'traitee', pickupInDays: -6, createdHoursAgo: 160 },
  { status: 'traitee', pickupInDays: -8, createdHoursAgo: 200 },
  { status: 'annulee', pickupInDays: 1, createdHoursAgo: 24 },
  { status: 'annulee', pickupInDays: -3, createdHoursAgo: 96 },
  { status: 'annulee', pickupInDays: -5, createdHoursAgo: 140 },
]

const statusPaths: Record<
  DemoStatus,
  Array<[string | null, string, string]>
> = {
  nouvelle: [
    [null, 'paiement_en_attente', 'Checkout créé'],
    ['paiement_en_attente', 'nouvelle', 'Paiement confirmé'],
  ],
  preparee: [
    [null, 'paiement_en_attente', 'Checkout créé'],
    ['paiement_en_attente', 'nouvelle', 'Paiement confirmé'],
    ['nouvelle', 'preparee', 'statut_modifie'],
  ],
  traitee: [
    [null, 'paiement_en_attente', 'Checkout créé'],
    ['paiement_en_attente', 'nouvelle', 'Paiement confirmé'],
    ['nouvelle', 'preparee', 'statut_modifie'],
    ['preparee', 'traitee', 'statut_modifie'],
  ],
  annulee: [
    [null, 'paiement_en_attente', 'Checkout créé'],
    ['paiement_en_attente', 'nouvelle', 'Paiement confirmé'],
    ['nouvelle', 'annulee', 'annulation'],
  ],
  paiement_a_verifier: [
    [null, 'paiement_en_attente', 'Checkout créé'],
    [
      'paiement_en_attente',
      'paiement_a_verifier',
      'Stock insuffisant au paiement',
    ],
  ],
}

function assertLocalDatabase(connectionString: string) {
  const { hostname } = new URL(connectionString)

  if (!LOCAL_HOSTS.includes(hostname.replace(/^\[|\]$/g, ''))) {
    throw new Error(
      `Demo orders refused: DATABASE_URL must target a local database (got host "${hostname}")`,
    )
  }
}

function pickupDate(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  date.setHours(12, 0, 0, 0)

  return date
}

function hoursAgo(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000)
}

// Reserves stock like CommandeStockReservationService, without lot allocation.
async function reserveStock(
  tx: Parameters<Parameters<PrismaClient['$transaction']>[0]>[0],
  commandeId: number,
  lignes: Array<{ id: number; articleId: number; quantite: number }>,
) {
  for (const ligne of lignes) {
    const article = await tx.article.findUniqueOrThrow({
      where: { id: ligne.articleId },
      select: { stock: true },
    })

    await tx.article.update({
      where: { id: ligne.articleId },
      data: { stock: { decrement: ligne.quantite } },
    })
    await tx.mouvementStock.create({
      data: {
        type: 'commande',
        cible: 'article',
        articleId: ligne.articleId,
        quantite: -ligne.quantite,
        stockAvant: article.stock,
        stockApres: article.stock - ligne.quantite,
        motif: `Réservation commande de démo #${commandeId}`,
        reference: `commande:${commandeId}:reservation`,
      },
    })
    await tx.ligneCommande.update({
      where: { id: ligne.id },
      data: {
        quantitePrecommande: Math.max(
          0,
          ligne.quantite - Math.max(0, article.stock),
        ),
      },
    })
  }
}

async function removePreviousDemoOrders(prisma: PrismaClient) {
  const previous = await prisma.commande.findMany({
    where: { trackingToken: { startsWith: DEMO_TOKEN_PREFIX } },
    include: { lignes: true, reservationRelease: true, refunds: true },
  })

  for (const commande of previous) {
    if (commande.refunds.length > 0) {
      throw new Error(
        `Demo order #${commande.id} has refunds: remove it manually before reseeding`,
      )
    }

    await prisma.$transaction(async (tx) => {
      // Orders cancelled from the back-office already got their stock back.
      if (!commande.reservationRelease) {
        for (const ligne of commande.lignes) {
          await tx.article.update({
            where: { id: ligne.articleId },
            data: { stock: { increment: ligne.quantite } },
          })
        }
      }

      await tx.mouvementStock.deleteMany({
        where: { reference: { startsWith: `commande:${commande.id}:` } },
      })
      await tx.ligneCommande.deleteMany({ where: { commandeId: commande.id } })
      await tx.commande.delete({ where: { id: commande.id } })
    })
  }

  return previous.length
}

async function main() {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error('DATABASE_URL manquante')
  }

  assertLocalDatabase(connectionString)

  const pool = new Pool({ connectionString })
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

  try {
    const removed = await removePreviousDemoOrders(prisma)
    const articles = await prisma.article.findMany({
      where: { online: true, archivedAt: null, prixCents: { gt: 0 } },
      orderBy: { id: 'asc' },
      take: 10,
    })

    if (articles.length === 0) {
      throw new Error(
        'Aucun article en ligne : lancez d’abord `pnpm --filter @localco/api seed`',
      )
    }

    const pickupPoints = await prisma.pickupPoint.findMany({
      where: { active: true },
      orderBy: { id: 'asc' },
    })
    const lieux =
      pickupPoints.length > 0
        ? pickupPoints.map((point) => `${point.label} - ${point.schedule}`)
        : ['À la ferme']

    for (const [index, spec] of specs.entries()) {
      const [nom, tel] = customers[index % customers.length]
      const lineCount = 1 + (index % 3)
      const lignes = Array.from({ length: lineCount }, (_, lineIndex) => {
        const article = articles[(index * 3 + lineIndex) % articles.length]

        return {
          articleId: article.id,
          quantite: 1 + ((index + lineIndex) % 3),
          prixUnitCents: article.prixCents,
        }
      })
      // Merge duplicated articles to keep one line per article.
      const uniqueLignes = Array.from(
        lignes
          .reduce((byArticle, ligne) => {
            const existing = byArticle.get(ligne.articleId)
            byArticle.set(
              ligne.articleId,
              existing
                ? { ...existing, quantite: existing.quantite + ligne.quantite }
                : ligne,
            )
            return byArticle
          }, new Map<number, (typeof lignes)[number]>())
          .values(),
      )
      const createdAt = hoursAgo(spec.createdHoursAgo)
      const path = statusPaths[spec.status]
      const email = `${nom
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/\s+/g, '.')}@example.test`

      await prisma.$transaction(async (tx) => {
        const commande = await tx.commande.create({
          data: {
            trackingToken: `${DEMO_TOKEN_PREFIX}${index + 1}`,
            nom,
            email,
            tel,
            totalTtcCents: uniqueLignes.reduce(
              (total, ligne) => total + ligne.prixUnitCents * ligne.quantite,
              0,
            ),
            lieu: lieux[index % lieux.length],
            dateRetrait:
              spec.pickupInDays === null ? null : pickupDate(spec.pickupInDays),
            statut: spec.status,
            confirmedAt:
              spec.status === 'paiement_a_verifier'
                ? null
                : new Date(createdAt.getTime() + 2 * 60 * 1000),
            createdAt,
            lignes: { create: uniqueLignes },
            historique: {
              create: path.map(
                ([ancienStatut, nouveauStatut, motif], step) => ({
                  ancienStatut,
                  nouveauStatut,
                  motif,
                  // Spread transitions after the order creation time.
                  createdAt: new Date(
                    createdAt.getTime() + step * 45 * 60 * 1000,
                  ),
                }),
              ),
            },
          },
          include: { lignes: true },
        })

        await reserveStock(tx, commande.id, commande.lignes)

        if (spec.status === 'annulee') {
          // Cancelled orders have their reservation released, like the API does.
          for (const ligne of commande.lignes) {
            await tx.article.update({
              where: { id: ligne.articleId },
              data: { stock: { increment: ligne.quantite } },
            })
          }
          await tx.commandeReservationRelease.create({
            data: { commandeId: commande.id },
          })
        }
      })
    }

    console.log(
      `Commandes de démo : ${removed} supprimée(s), ${specs.length} créée(s).`,
    )
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
