import 'dotenv/config'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from './generated/prisma/client'

type SeedArticle = {
  id: number
  nom: string
  prix: number
  tva: number
  nomen: {
    quantite: number
    mp: {
      coutUnitaire: number
    }
  }[]
}

type SeedMatiere = {
  id: number
  nom: string
  stock: number
  unite: string
}

type SeedCatalogue = {
  articles: Record<string, SeedArticle>
  matieres: Record<string, SeedMatiere>
}

type SaleLineSeed = {
  article: SeedArticle
  quantite: number
}

type SaleSeed = {
  date: Date
  mode: 'cb' | 'especes' | 'cheque'
  remise: number
  lignes: SaleLineSeed[]
}

const TIME_ZONE = 'Europe/Paris'

async function main() {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error('DATABASE_URL manquante')
  }

  const pool = new Pool({ connectionString })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  await resetDatabase(prisma)

  const catalogue = await seedCatalogue(prisma)
  await seedStockLots(prisma, catalogue)
  await seedSalesHistory(prisma, catalogue.articles)

  await prisma.$disconnect()
  await pool.end()

  console.log('Seed terminé avec catalogue, ventes, lots DLC et historique de caisse')
}

async function resetDatabase(prisma: PrismaClient) {
  await prisma.journeeCaisse.deleteMany()
  await prisma.ligneVente.deleteMany()
  await prisma.vente.deleteMany()
  await prisma.ligneCommande.deleteMany()
  await prisma.commande.deleteMany()
  await prisma.mouvementStock.deleteMany()
  await prisma.stockLot.deleteMany()
  await prisma.nomenclature.deleteMany()
  await prisma.matierePremiere.deleteMany()
  await prisma.article.deleteMany()
}

async function seedCatalogue(prisma: PrismaClient): Promise<SeedCatalogue> {
  const farine = await prisma.matierePremiere.create({
    data: {
      nom: 'Farine T65',
      stock: 80,
      unite: 'kg',
      coutUnitaire: 1.2,
      seuil: 10,
      conditionnement: 'sac de 25 kg',
    },
  })

  const beurre = await prisma.matierePremiere.create({
    data: {
      nom: 'Beurre AOP',
      stock: 25,
      unite: 'kg',
      coutUnitaire: 8.5,
      seuil: 4,
      conditionnement: 'carton',
    },
  })

  const levure = await prisma.matierePremiere.create({
    data: {
      nom: 'Levure boulangere',
      stock: 6,
      unite: 'kg',
      coutUnitaire: 6.2,
      seuil: 1,
      conditionnement: 'sachet sous vide',
    },
  })

  const sucre = await prisma.matierePremiere.create({
    data: {
      nom: 'Sucre',
      stock: 40,
      unite: 'kg',
      coutUnitaire: 1.6,
      seuil: 8,
      conditionnement: 'sac de 5 kg',
    },
  })

  const lait = await prisma.matierePremiere.create({
    data: {
      nom: 'Lait entier',
      stock: 35,
      unite: 'L',
      coutUnitaire: 0.95,
      seuil: 8,
      conditionnement: 'brique',
    },
  })

  const baguette = await prisma.article.create({
    data: {
      nom: 'Baguette tradition',
      prix: 1.2,
      tva: 0.055,
      stock: 120,
      online: false,
      emoji: 'BT',
      description: 'Baguette tradition croustillante',
    },
  })

  const croissant = await prisma.article.create({
    data: {
      nom: 'Croissant',
      prix: 1.1,
      tva: 0.055,
      stock: 90,
      online: false,
      emoji: 'CR',
      description: 'Croissant pur beurre',
    },
  })

  const painChocolat = await prisma.article.create({
    data: {
      nom: 'Pain au chocolat',
      prix: 1.2,
      tva: 0.055,
      stock: 80,
      online: false,
      emoji: 'PC',
      description: 'Pain au chocolat pur beurre',
    },
  })

  const flan = await prisma.article.create({
    data: {
      nom: 'Flan patissier',
      prix: 3.5,
      tva: 0.055,
      stock: 25,
      online: false,
      emoji: 'FL',
      description: 'Part de flan maison',
    },
  })

  await seedShopCatalogue(prisma)

  await prisma.nomenclature.createMany({
    data: [
      { articleId: baguette.id, mpId: farine.id, quantite: 0.35 },
      { articleId: baguette.id, mpId: levure.id, quantite: 0.01 },
      { articleId: croissant.id, mpId: farine.id, quantite: 0.08 },
      { articleId: croissant.id, mpId: beurre.id, quantite: 0.04 },
      { articleId: croissant.id, mpId: sucre.id, quantite: 0.01 },
      { articleId: painChocolat.id, mpId: farine.id, quantite: 0.08 },
      { articleId: painChocolat.id, mpId: beurre.id, quantite: 0.04 },
      { articleId: painChocolat.id, mpId: sucre.id, quantite: 0.015 },
      { articleId: flan.id, mpId: lait.id, quantite: 0.2 },
      { articleId: flan.id, mpId: sucre.id, quantite: 0.04 },
    ],
  })

  const seededArticles = await prisma.article.findMany({
    include: {
      nomen: {
        include: {
          mp: true,
        },
      },
    },
    orderBy: {
      nom: 'asc',
    },
  })

  return {
    articles: {
      baguette: seededArticles.find((article) => article.id === baguette.id)!,
      croissant: seededArticles.find((article) => article.id === croissant.id)!,
      painChocolat: seededArticles.find(
        (article) => article.id === painChocolat.id,
      )!,
      flan: seededArticles.find((article) => article.id === flan.id)!,
    },
    matieres: {
      farine,
      beurre,
      levure,
      sucre,
      lait,
    },
  }
}

async function seedShopCatalogue(prisma: PrismaClient) {
  await prisma.article.createMany({
    data: [
      {
        nom: 'Gésiers de poulet confits',
        prix: 8.3,
        stock: 20,
        online: true,
        emoji: 'GP',
        description: 'Bocal +/- 350 g.',
      },
      {
        nom: 'Mousse de foie de volaille',
        prix: 5.3,
        stock: 20,
        online: true,
        emoji: 'MF',
        description: 'Pot 180 g.',
      },
      {
        nom: 'Terrine de poulet normande',
        prix: 5.3,
        stock: 20,
        online: true,
        emoji: 'TN',
        description: 'Pot 200 g.',
      },
      {
        nom: 'Rillettes de poulet',
        prix: 5.3,
        stock: 20,
        online: true,
        emoji: 'RP',
        description: 'Pot 200 g.',
      },
      {
        nom: "Rillettes de poulet piment d'Espelette",
        prix: 5.9,
        stock: 20,
        online: true,
        emoji: 'RE',
        description: 'Pot 200 g.',
      },
      {
        nom: 'Terrine de poulet au thym',
        prix: 5.9,
        stock: 20,
        online: true,
        emoji: 'TT',
        description: 'Pot 200 g.',
      },
      {
        nom: 'Terrine de poulet noisette',
        prix: 5.9,
        stock: 20,
        online: true,
        emoji: 'TP',
        description: 'Pot 200 g.',
      },
      {
        nom: 'Poulet prêt à cuire 4/6 personnes',
        prix: 15.5,
        stock: 12,
        online: true,
        emoji: 'P4',
        description: 'Pièce +/- 1,4 à 1,6 kg.',
      },
      {
        nom: 'Poulet prêt à cuire 6/8 personnes',
        prix: 17.5,
        stock: 12,
        online: true,
        emoji: 'P6',
        description: 'Pièce +/- 1,7 à 1,8 kg.',
      },
      {
        nom: 'Poulet prêt à cuire 8 personnes et plus',
        prix: 18.5,
        stock: 12,
        online: true,
        emoji: 'P8',
        description: 'Pièce +/- 1,9 à 2,1 kg.',
      },
      {
        nom: 'Blanc de poulet x2',
        prix: 7.5,
        stock: 24,
        online: true,
        emoji: 'B2',
        description: 'Barquette +/- 350 g.',
      },
      {
        nom: 'Blanc de poulet x4',
        prix: 14,
        stock: 24,
        online: true,
        emoji: 'B4',
        description: 'Barquette +/- 700 g.',
      },
      {
        nom: 'Cuisse entière x2',
        prix: 8,
        stock: 24,
        online: true,
        emoji: 'C2',
        description: 'Barquette +/- 550 g.',
      },
      {
        nom: 'Cuisse entière x4',
        prix: 15,
        stock: 24,
        online: true,
        emoji: 'C4',
        description: 'Barquette +/- 1,1 kg.',
      },
      {
        nom: 'Cuisse désossée x2',
        prix: 5.5,
        stock: 24,
        online: true,
        emoji: 'CD',
        description: 'Barquette +/- 350 g.',
      },
      {
        nom: 'Haut de cuisse x2',
        prix: 4.5,
        stock: 24,
        online: true,
        emoji: 'HC',
        description: 'Barquette +/- 500 g.',
      },
      {
        nom: 'Pilons de poulet x2',
        prix: 3.3,
        stock: 24,
        online: true,
        emoji: 'PP',
        description: 'Barquette +/- 250 g.',
      },
      {
        nom: 'Ailes de poulet x3',
        prix: 4,
        stock: 24,
        online: true,
        emoji: 'AP',
        description: 'Barquette +/- 400 g.',
      },
      {
        nom: 'Saucisse nature x6',
        prix: 6.5,
        stock: 30,
        online: true,
        emoji: 'SN',
        description: 'Préparation bouchère +/- 500 g.',
      },
      {
        nom: 'Saucisse aux herbes x6',
        prix: 6.3,
        stock: 30,
        online: true,
        emoji: 'SH',
        description: 'Préparation bouchère.',
      },
      {
        nom: 'Saucisse provençale x6',
        prix: 6.3,
        stock: 30,
        online: true,
        emoji: 'SP',
        description: 'Préparation bouchère.',
      },
      {
        nom: 'Volaille façon merguez x6',
        prix: 6.5,
        stock: 30,
        online: true,
        emoji: 'VM',
        description: 'Préparation bouchère.',
      },
      {
        nom: 'Paupiette chorizo x2',
        prix: 6.5,
        stock: 20,
        online: true,
        emoji: 'PC',
        description: 'Barquette +/- 450 g.',
      },
      {
        nom: 'Paupiette camembert x2',
        prix: 6.5,
        stock: 20,
        online: true,
        emoji: 'PA',
        description: 'Barquette +/- 450 g.',
      },
      {
        nom: 'Paupiette bacon x2',
        prix: 6.5,
        stock: 20,
        online: true,
        emoji: 'PB',
        description: 'Barquette +/- 450 g.',
      },
      {
        nom: 'Ballotine chorizo',
        prix: 9.5,
        stock: 20,
        online: true,
        emoji: 'BC',
        description: 'Pièce +/- 350 g.',
      },
      {
        nom: 'Ballotine camembert',
        prix: 9.5,
        stock: 20,
        online: true,
        emoji: 'BA',
        description: 'Pièce +/- 350 g.',
      },
      {
        nom: 'Ballotine bacon',
        prix: 9.5,
        stock: 20,
        online: true,
        emoji: 'BB',
        description: 'Pièce +/- 350 g.',
      },
      {
        nom: 'Cordon bleu x2',
        prix: 9,
        stock: 20,
        online: true,
        emoji: 'CB',
        description: 'Barquette +/- 500 g.',
      },
      {
        nom: 'Chicken x6',
        prix: 7.5,
        stock: 20,
        online: true,
        emoji: 'CH',
        description: 'Barquette +/- 400 g.',
      },
      {
        nom: 'Escalope milanaise x2',
        prix: 5.5,
        stock: 20,
        online: true,
        emoji: 'EM',
        description: 'Barquette +/- 350 g.',
      },
      {
        nom: 'Brochette thym citron x2',
        prix: 4.5,
        stock: 30,
        online: true,
        emoji: 'BT',
        description: 'Barquette +/- 250 g.',
      },
      {
        nom: 'Brochette curry coco x2',
        prix: 4.5,
        stock: 30,
        online: true,
        emoji: 'BC',
        description: 'Barquette +/- 250 g.',
      },
      {
        nom: 'Brochette x2',
        prix: 4.5,
        stock: 30,
        online: true,
        emoji: 'BR',
        description: 'Barquette +/- 250 g.',
      },
      {
        nom: 'Œufs x6',
        prix: 2,
        stock: 40,
        online: true,
        emoji: 'O6',
        description: 'Boîte de 6 œufs.',
      },
      {
        nom: 'Œufs x12',
        prix: 3.6,
        stock: 40,
        online: true,
        emoji: 'O12',
        description: 'Boîte de 12 œufs.',
      },
      {
        nom: 'Œufs x24',
        prix: 6.8,
        stock: 40,
        online: true,
        emoji: 'O24',
        description: 'Plateau de 24 œufs.',
      },
      {
        nom: 'Œufs x30',
        prix: 8.2,
        stock: 40,
        online: true,
        emoji: 'O30',
        description: 'Plateau de 30 œufs.',
      },
      {
        nom: 'BBQ Pack',
        prix: 12,
        stock: 15,
        online: true,
        emoji: 'BQ',
        description:
          'Pack grillades : brochettes, saucisses nature, saucisses aux herbes et volaille façon merguez.',
      },
      {
        nom: 'Ado Pack',
        prix: 28,
        stock: 15,
        online: true,
        emoji: 'AD',
        description:
          'Pack grillades familial : brochettes et assortiments de saucisses.',
      },
      {
        nom: 'Family Pack',
        prix: 40,
        stock: 15,
        online: true,
        emoji: 'FP',
        description:
          'Grand pack grillades : brochettes, saucisses nature, herbes, provençales et volaille façon merguez.',
      },
      {
        nom: 'Maxi Pack',
        prix: 78,
        stock: 10,
        online: true,
        emoji: 'MP',
        description:
          'Pack grillades maxi pour grands repas, avec assortiment de brochettes et saucisses.',
      },
    ],
  })
}

async function seedStockLots(prisma: PrismaClient, catalogue: SeedCatalogue) {
  const { articles, matieres } = catalogue

  await prisma.stockLot.createMany({
    data: [
      {
        target: 'matiere_premiere',
        mpId: matieres.lait.id,
        initialQuantity: 5,
        remainingQuantity: 4,
        expiresAt: daysFromNow(-1),
        reference: 'seed-lait-expired',
      },
      {
        target: 'matiere_premiere',
        mpId: matieres.levure.id,
        initialQuantity: 2,
        remainingQuantity: 1,
        expiresAt: daysFromNow(1),
        reference: 'seed-levure-urgent',
      },
      {
        target: 'matiere_premiere',
        mpId: matieres.beurre.id,
        initialQuantity: 8,
        remainingQuantity: 6,
        expiresAt: daysFromNow(2),
        reference: 'seed-beurre-near',
      },
      {
        target: 'matiere_premiere',
        mpId: matieres.farine.id,
        initialQuantity: 35,
        remainingQuantity: 35,
        expiresAt: daysFromNow(20),
        reference: 'seed-farine-ok',
      },
      {
        target: 'article',
        articleId: articles.flan.id,
        initialQuantity: 4,
        remainingQuantity: 3,
        expiresAt: daysFromNow(-1),
        reference: 'seed-flan-expired',
      },
      {
        target: 'article',
        articleId: articles.baguette.id,
        initialQuantity: 25,
        remainingQuantity: 18,
        expiresAt: daysFromNow(1),
        reference: 'seed-baguette-urgent',
      },
      {
        target: 'article',
        articleId: articles.croissant.id,
        initialQuantity: 15,
        remainingQuantity: 12,
        expiresAt: daysFromNow(2),
        reference: 'seed-croissant-near',
      },
      {
        target: 'article',
        articleId: articles.painChocolat.id,
        initialQuantity: 20,
        remainingQuantity: 20,
        expiresAt: daysFromNow(5),
        reference: 'seed-pain-chocolat-ok',
      },
    ],
  })
}

async function seedSalesHistory(
  prisma: PrismaClient,
  articles: Record<string, SeedArticle>,
) {
  const now = new Date()
  const history = [
    {
      daysAgo: 5,
      sales: [
        createSaleSeed(now, 5, 8, 'cb', 0, [
          { article: articles.baguette, quantite: 12 },
          { article: articles.croissant, quantite: 6 },
        ]),
        createSaleSeed(now, 5, 12, 'especes', 0, [
          { article: articles.painChocolat, quantite: 5 },
          { article: articles.flan, quantite: 2 },
        ]),
        createSaleSeed(now, 5, 17, 'cb', 1, [
          { article: articles.baguette, quantite: 10 },
          { article: articles.croissant, quantite: 4 },
        ]),
      ],
    },
    {
      daysAgo: 4,
      sales: [
        createSaleSeed(now, 4, 9, 'cb', 0, [
          { article: articles.baguette, quantite: 18 },
          { article: articles.painChocolat, quantite: 8 },
        ]),
        createSaleSeed(now, 4, 14, 'cheque', 0, [
          { article: articles.flan, quantite: 3 },
          { article: articles.croissant, quantite: 7 },
        ]),
      ],
    },
    {
      daysAgo: 3,
      sales: [
        createSaleSeed(now, 3, 8, 'especes', 0, [
          { article: articles.baguette, quantite: 9 },
          { article: articles.croissant, quantite: 10 },
        ]),
        createSaleSeed(now, 3, 13, 'cb', 0.5, [
          { article: articles.painChocolat, quantite: 6 },
          { article: articles.flan, quantite: 4 },
        ]),
        createSaleSeed(now, 3, 18, 'cb', 0, [
          { article: articles.baguette, quantite: 15 },
        ]),
      ],
    },
    {
      daysAgo: 2,
      sales: [
        createSaleSeed(now, 2, 10, 'cb', 0, [
          { article: articles.baguette, quantite: 22 },
          { article: articles.croissant, quantite: 8 },
        ]),
        createSaleSeed(now, 2, 16, 'especes', 0, [
          { article: articles.painChocolat, quantite: 7 },
          { article: articles.flan, quantite: 2 },
        ]),
      ],
    },
    {
      daysAgo: 1,
      sales: [
        createSaleSeed(now, 1, 8, 'cb', 0, [
          { article: articles.baguette, quantite: 16 },
          { article: articles.croissant, quantite: 12 },
        ]),
        createSaleSeed(now, 1, 12, 'especes', 1, [
          { article: articles.painChocolat, quantite: 9 },
          { article: articles.flan, quantite: 3 },
        ]),
        createSaleSeed(now, 1, 18, 'cheque', 0, [
          { article: articles.baguette, quantite: 8 },
          { article: articles.flan, quantite: 2 },
        ]),
      ],
    },
  ]

  for (const day of history) {
    const sales: Awaited<ReturnType<typeof createVente>>[] = []

    for (const sale of day.sales) {
      sales.push(await createVente(prisma, sale))
    }

    await createClosedCashDay(prisma, day.sales[0].date, sales)
  }
}

function createSaleSeed(
  baseDate: Date,
  daysAgo: number,
  hour: number,
  mode: SaleSeed['mode'],
  remise: number,
  lignes: SaleLineSeed[],
): SaleSeed {
  const date = new Date(baseDate)
  date.setDate(date.getDate() - daysAgo)
  date.setHours(hour, 30, 0, 0)

  return {
    date,
    mode,
    remise,
    lignes,
  }
}

function daysFromNow(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  date.setHours(12, 0, 0, 0)

  return date
}

async function createVente(prisma: PrismaClient, sale: SaleSeed) {
  const lignesCalculees = sale.lignes.map((ligne) => {
    const totalLigneTTC = ligne.article.prix * ligne.quantite
    const totalLigneHT = totalLigneTTC / (1 + ligne.article.tva)

    return {
      article: ligne.article,
      quantite: ligne.quantite,
      prixUnit: ligne.article.prix,
      totalLigneTTC,
      totalLigneHT,
    }
  })

  const totalAvantRemiseTTC = lignesCalculees.reduce(
    (total, ligne) => total + ligne.totalLigneTTC,
    0,
  )
  const totalTTC = Math.max(0, totalAvantRemiseTTC - sale.remise)
  const totalAvantRemiseHT = lignesCalculees.reduce(
    (total, ligne) => total + ligne.totalLigneHT,
    0,
  )
  const ratio = totalAvantRemiseTTC > 0 ? totalTTC / totalAvantRemiseTTC : 1
  const totalHT = totalAvantRemiseHT * ratio
  const tva = totalTTC - totalHT

  return prisma.vente.create({
    data: {
      date: sale.date,
      mode: sale.mode,
      remise: sale.remise,
      totalTTC,
      totalHT,
      tva,
      lignes: {
        create: lignesCalculees.map((ligne) => ({
          articleId: ligne.article.id,
          quantite: ligne.quantite,
          prixUnit: ligne.prixUnit,
          tva: ligne.article.tva,
        })),
      },
    },
    include: {
      lignes: {
        include: {
          article: {
            include: {
              nomen: {
                include: {
                  mp: true,
                },
              },
            },
          },
        },
      },
    },
  })
}

async function createClosedCashDay(
  prisma: PrismaClient,
  date: Date,
  ventes: Awaited<ReturnType<typeof createVente>>[],
) {
  const dayStart = getParisDayStart(date)

  const totals = ventes.reduce(
    (acc, vente) => {
      const coutMatieres = vente.lignes.reduce((venteCost, ligne) => {
        const coutUnitaire = ligne.article.nomen.reduce(
          (lineCost, nomenclatureLine) =>
            lineCost +
            nomenclatureLine.quantite * nomenclatureLine.mp.coutUnitaire,
          0,
        )

        return venteCost + coutUnitaire * ligne.quantite
      }, 0)

      return {
        totalTTC: acc.totalTTC + vente.totalTTC,
        totalHT: acc.totalHT + vente.totalHT,
        tva: acc.tva + vente.tva,
        especes: acc.especes + (vente.mode === 'especes' ? vente.totalTTC : 0),
        cb: acc.cb + (vente.mode === 'cb' ? vente.totalTTC : 0),
        cheques: acc.cheques + (vente.mode === 'cheque' ? vente.totalTTC : 0),
        marge: acc.marge + (vente.totalHT - coutMatieres),
        nbVentes: acc.nbVentes + 1,
      }
    },
    {
      totalTTC: 0,
      totalHT: 0,
      tva: 0,
      especes: 0,
      cb: 0,
      cheques: 0,
      marge: 0,
      nbVentes: 0,
    },
  )

  await prisma.journeeCaisse.create({
    data: {
      date: dayStart,
      clotureeA: new Date(dayStart.getTime() + 18 * 60 * 60 * 1000),
      ...totals,
    },
  })
}

function getParisDayStart(date: Date) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const parts = formatter.formatToParts(date)
  const year = Number(parts.find((part) => part.type === 'year')?.value)
  const month = Number(parts.find((part) => part.type === 'month')?.value)
  const day = Number(parts.find((part) => part.type === 'day')?.value)
  const utcGuess = new Date(Date.UTC(year, month - 1, day, 0, 0, 0))
  const offset = getTimeZoneOffsetMs(utcGuess, TIME_ZONE)

  return new Date(utcGuess.getTime() - offset)
}

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const parts = formatter.formatToParts(date)
  const getPart = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value)
  const asUtc = Date.UTC(
    getPart('year'),
    getPart('month') - 1,
    getPart('day'),
    getPart('hour') % 24,
    getPart('minute'),
    getPart('second'),
  )

  return asUtc - date.getTime()
}

main().catch(async (e) => {
  console.error(e)
  process.exit(1)
})
