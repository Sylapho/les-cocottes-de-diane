import 'dotenv/config'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from './generated/prisma/client'

const screenshotDatabasePattern = /screenshots?/i

type DemoOrderLine = {
  articleName: string
  quantity: number
  preorderQuantity?: number
}

type DemoOrder = {
  trackingToken: string
  name: string
  email: string
  phone: string
  pickupPoint: string
  pickupInDays: number
  status: string
  createdDaysAgo: number
  lines: DemoOrderLine[]
}

const demoOrders: DemoOrder[] = [
  {
    trackingToken: 'portfolio-order-camille',
    name: 'Camille Martin',
    email: 'camille.martin@example.test',
    phone: '06 12 34 56 78',
    pickupPoint: 'Marché de Gaillon - Mardi matin, 8h-12h',
    pickupInDays: 1,
    status: 'nouvelle',
    createdDaysAgo: 1,
    lines: [
      { articleName: 'Cordon bleu x2', quantity: 3, preorderQuantity: 2 },
      { articleName: 'Oeufs x12', quantity: 1 },
    ],
  },
  {
    trackingToken: 'portfolio-order-ready',
    name: 'Lucas Bernard',
    email: 'lucas.bernard@example.test',
    phone: '06 23 45 67 89',
    pickupPoint: 'À la ferme - Vendredi, 16h-19h',
    pickupInDays: 2,
    status: 'preparee',
    createdDaysAgo: 2,
    lines: [
      { articleName: 'Family Pack', quantity: 1 },
      { articleName: 'Terrine de poulet normande', quantity: 2 },
    ],
  },
  {
    trackingToken: 'portfolio-order-elodie',
    name: 'Élodie Petit',
    email: 'elodie.petit@example.test',
    phone: '07 34 56 78 90',
    pickupPoint: 'Marché de Vernon - Samedi matin, 8h-13h',
    pickupInDays: 3,
    status: 'nouvelle',
    createdDaysAgo: 0,
    lines: [
      {
        articleName: 'Saucisse aux herbes x6',
        quantity: 4,
        preorderQuantity: 1,
      },
      { articleName: 'Brochette thym citron x2', quantity: 3 },
    ],
  },
  {
    trackingToken: 'portfolio-order-review',
    name: 'Marc Leroy',
    email: 'marc.leroy@example.test',
    phone: '06 45 67 89 01',
    pickupPoint: 'Marché de Louviers - Samedi matin, 8h-13h',
    pickupInDays: 4,
    status: 'paiement_a_verifier',
    createdDaysAgo: 1,
    lines: [{ articleName: 'Maxi Pack', quantity: 1 }],
  },
  {
    trackingToken: 'portfolio-order-completed',
    name: 'Sophie Roux',
    email: 'sophie.roux@example.test',
    phone: '07 56 78 90 12',
    pickupPoint: 'À la ferme - Vendredi, 16h-19h',
    pickupInDays: -1,
    status: 'traitee',
    createdDaysAgo: 5,
    lines: [
      { articleName: 'Poulet prêt à cuire 4/6 personnes', quantity: 1 },
      { articleName: 'Rillettes de poulet', quantity: 2 },
    ],
  },
]

async function main() {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error('DATABASE_URL is required')
  }

  assertScreenshotDatabase(connectionString)

  const pool = new Pool({ connectionString })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  try {
    await prisma.authUser.deleteMany()
    const articles = await prisma.article.findMany()
    const articlesByName = new Map(
      articles.map((article) => [article.nom, article]),
    )

    for (const order of demoOrders) {
      const lines = order.lines.map((line) => {
        const article = articlesByName.get(line.articleName)

        if (!article) {
          throw new Error(`Screenshot article not found: ${line.articleName}`)
        }

        return {
          articleId: article.id,
          quantite: line.quantity,
          quantitePrecommande: line.preorderQuantity ?? 0,
          prixUnitCents: article.prixCents,
        }
      })
      const totalTtcCents = lines.reduce(
        (total, line) => total + line.prixUnitCents * line.quantite,
        0,
      )

      await prisma.commande.create({
        data: {
          trackingToken: order.trackingToken,
          nom: order.name,
          email: order.email,
          tel: order.phone,
          totalTtcCents,
          lieu: order.pickupPoint,
          dateRetrait: dateAtNoon(order.pickupInDays),
          statut: order.status,
          createdAt: dateAtHour(
            -order.createdDaysAgo,
            9 + order.createdDaysAgo,
          ),
          lignes: { create: lines },
          historique: {
            create: {
              ancienStatut: null,
              nouveauStatut: order.status,
              motif: 'Portfolio screenshot dataset',
            },
          },
        },
      })
    }

    await seedStockHighlights(prisma, articlesByName)
    await seedDailySales(prisma, articlesByName)

    console.log('Screenshot demo data seeded')
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

function assertScreenshotDatabase(connectionString: string) {
  const databaseUrl = new URL(connectionString)
  const databaseName = databaseUrl.pathname.replace(/^\//, '')
  const isLocalHost = ['localhost', '127.0.0.1'].includes(databaseUrl.hostname)

  if (!isLocalHost || !screenshotDatabasePattern.test(databaseName)) {
    throw new Error(
      'Screenshot seed refused: DATABASE_URL must target a local database whose name contains "screenshot"',
    )
  }
}

async function seedStockHighlights(
  prisma: PrismaClient,
  articlesByName: Map<string, { id: number; stock: number }>,
) {
  const highlights = [
    { name: 'Cordon bleu x2', stock: -4, previousStock: 3 },
    { name: 'Saucisse aux herbes x6', stock: 2, previousStock: 9 },
    { name: 'Family Pack', stock: 4, previousStock: 8 },
  ]

  for (const highlight of highlights) {
    const article = articlesByName.get(highlight.name)

    if (!article) continue

    await prisma.article.update({
      where: { id: article.id },
      data: { stock: highlight.stock },
    })
    await prisma.mouvementStock.create({
      data: {
        type: 'commande',
        cible: 'article',
        articleId: article.id,
        quantite: highlight.stock - highlight.previousStock,
        stockAvant: highlight.previousStock,
        stockApres: highlight.stock,
        motif: 'Réservation de commandes Click & Collect',
        reference: 'portfolio-screenshots',
        createdAt: dateAtHour(-1, 15),
      },
    })
  }
}

async function seedDailySales(
  prisma: PrismaClient,
  articlesByName: Map<string, { id: number; prixCents: number }>,
) {
  const seller = await prisma.user.upsert({
    where: { email: 'julie.moreau@example.test' },
    update: {
      nom: 'Julie Moreau',
      role: 'vendeur',
    },
    create: {
      nom: 'Julie Moreau',
      email: 'julie.moreau@example.test',
      role: 'vendeur',
    },
  })
  const saleDefinitions = [
    { articleName: 'Terrine de poulet normande', quantity: 3, mode: 'cb' },
    { articleName: 'Oeufs x12', quantity: 2, mode: 'especes' },
    { articleName: 'Cordon bleu x2', quantity: 1, mode: 'cb' },
  ]

  for (const [index, sale] of saleDefinitions.entries()) {
    const article = articlesByName.get(sale.articleName)

    if (!article) continue

    const totalTtcCents = article.prixCents * sale.quantity
    const totalHtCents = Math.round(totalTtcCents / 1.055)

    await prisma.vente.create({
      data: {
        date: dateAtHour(0, 10 + index * 2),
        totalTtcCents,
        totalHtCents,
        tvaCents: totalTtcCents - totalHtCents,
        mode: sale.mode,
        userId: seller.id,
        lignes: {
          create: {
            articleId: article.id,
            quantite: sale.quantity,
            prixUnitCents: article.prixCents,
            tvaBps: 550,
          },
        },
      },
    })
  }
}

function dateAtNoon(dayOffset: number) {
  return dateAtHour(dayOffset, 12)
}

function dateAtHour(dayOffset: number, hour: number) {
  const date = new Date()
  date.setDate(date.getDate() + dayOffset)
  date.setHours(hour, 0, 0, 0)
  return date
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
