import AnalyticsDashboard from '@/components/analytics/analytics-dashboard'
import CommandesTable from '@/components/commandes/commandes-table'
import {
  Callout,
  KeyFigures,
  PageContainer,
  PageHeading,
  Panel,
  SectionHeading,
} from '@/components/layout/page-layout'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty'
import {
  getArticles,
  getCommandes,
  getMatieresPremieres,
  getStockLots,
  type Article,
  type MatierePremiere,
  type StockLot,
} from '@/lib/api'
import { requireUiPermission } from '@/lib/auth-session'
import { actionableStatuses, getCommandeCounts } from '@/lib/commande-list'
import {
  canAccessBackOffice,
  canViewArticles,
  canViewOrders,
  canViewShopAnalytics,
  canViewStock,
} from '@/lib/permissions'
import { cn } from '@/lib/utils'
import Link from 'next/link'

const LOW_ARTICLE_STOCK = 5
const DASHBOARD_ORDERS_LIMIT = 8
const ATTENTION_ITEMS_LIMIT = 5

function formatToday(now: Date) {
  const label = new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'full',
    timeZone: 'Europe/Paris',
  }).format(now)

  return label.charAt(0).toUpperCase() + label.slice(1)
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeZone: 'Europe/Paris',
  }).format(new Date(value))
}

function plural(count: number, singular: string, pluralForm: string) {
  return `${count} ${count > 1 ? pluralForm : singular}`
}

function getLowStockArticles(articles: Article[]) {
  return articles
    .filter((article) => article.stock <= LOW_ARTICLE_STOCK)
    .sort((a, b) => a.stock - b.stock)
    .slice(0, ATTENTION_ITEMS_LIMIT)
}

function getStockAlerts(
  matieres: MatierePremiere[],
  lots: StockLot[],
  now: Date,
) {
  const nearLimit = new Date(now)
  nearLimit.setDate(nearLimit.getDate() + 3)

  const lowMatieres = matieres
    .filter((matiere) => matiere.stock <= matiere.seuil)
    .map((matiere) => ({
      id: `matiere-${matiere.id}`,
      label: `${matiere.nom} · ${matiere.stock} ${matiere.unite} (seuil ${matiere.seuil})`,
      href: `/matieres-premieres/${matiere.id}`,
    }))

  const expiringLots = lots
    .filter(
      (lot) =>
        lot.expiresAt &&
        lot.remainingQuantity > 0 &&
        new Date(lot.expiresAt) <= nearLimit,
    )
    .sort(
      (a, b) =>
        new Date(a.expiresAt ?? 0).getTime() -
        new Date(b.expiresAt ?? 0).getTime(),
    )
    .map((lot) => ({
      id: `lot-${lot.id}`,
      label: `${
        lot.target === 'article'
          ? (lot.article?.nom ?? `Article #${lot.articleId}`)
          : (lot.mp?.nom ?? `Matière #${lot.mpId}`)
      } · DLC ${formatShortDate(lot.expiresAt as string)}`,
      href: '/stock',
    }))

  return [...lowMatieres, ...expiringLots].slice(0, ATTENTION_ITEMS_LIMIT)
}

export default async function Home() {
  const session = await requireUiPermission(canAccessBackOffice)
  const userCanViewArticles = canViewArticles(session.user)
  const userCanViewOrders = canViewOrders(session.user)
  const userCanViewStock = canViewStock(session.user)
  const userCanViewShopAnalytics = canViewShopAnalytics(session.user)
  const [commandes, articles, matieres, lots] = await Promise.all([
    userCanViewOrders ? getCommandes() : Promise.resolve([]),
    userCanViewArticles ? getArticles() : Promise.resolve([]),
    userCanViewStock ? getMatieresPremieres() : Promise.resolve([]),
    userCanViewStock ? getStockLots() : Promise.resolve([]),
  ])
  const now = new Date()
  const counts = getCommandeCounts(commandes, now)
  const commandesATraiter = commandes
    .filter((commande) => actionableStatuses.has(commande.statut))
    .slice(0, DASHBOARD_ORDERS_LIMIT)
  const lowStockArticles = getLowStockArticles(articles)
  const stockAlerts = getStockAlerts(matieres, lots, now)

  return (
    <PageContainer>
      <PageHeading
        context="Vue d’ensemble"
        title="Une journée bien organisée."
        description={formatToday(now)}
      />

      {userCanViewOrders ? (
        <>
          <KeyFigures
            items={[
              {
                label: 'À préparer',
                value: counts.toPrepare,
                detail: 'Commandes nouvelles',
              },
              {
                label: 'Prêtes au retrait',
                value: counts.ready,
                detail: 'Commandes préparées',
              },
              {
                label: 'Retraits du jour',
                value: counts.pickupToday,
                detail: 'Date de retrait : aujourd’hui',
              },
              {
                label: 'À vérifier',
                value: counts.toCheck,
                detail: 'Paiement à contrôler',
              },
            ]}
          />

          <Callout
            tone="primary"
            size="large"
            title="La préparation du jour"
            action={
              <Button asChild className="w-full sm:w-60">
                <Link href="/preparation">Ouvrir la préparation</Link>
              </Button>
            }
          >
            {counts.toPrepare > 0
              ? `${plural(counts.toPrepare, 'commande', 'commandes')} à préparer · ${plural(counts.quantityToPrepare, 'article', 'articles')} au total`
              : 'Aucune commande nouvelle à préparer pour le moment.'}
          </Callout>

          <SectionHeading
            title="Les commandes à traiter"
            action={
              <Button asChild variant="secondary">
                <Link href="/commandes">
                  Tout consulter <span aria-hidden="true">→</span>
                </Link>
              </Button>
            }
          />

          {commandesATraiter.length > 0 ? (
            <CommandesTable commandes={commandesATraiter} />
          ) : (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>Aucune commande à traiter</EmptyTitle>
                <EmptyDescription>
                  Les nouvelles commandes, celles prêtes au retrait et les
                  paiements à vérifier apparaîtront ici.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </>
      ) : null}

      {userCanViewArticles || userCanViewStock ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {userCanViewArticles ? (
            <Panel
              title="Catalogue à surveiller"
              footer="Stock d’articles uniquement — matières séparées."
            >
              {lowStockArticles.length > 0 ? (
                <ul className="flex flex-col gap-4">
                  {lowStockArticles.map((article) => (
                    <li key={article.id}>
                      <Link
                        href={`/articles/${article.id}`}
                        className={cn(
                          'text-sm leading-5 hover:underline',
                          article.stock <= 0 && 'text-danger',
                        )}
                      >
                        {article.nom} ·{' '}
                        {article.stock <= 0
                          ? 'indisponible'
                          : `${plural(article.stock, 'unité disponible', 'unités disponibles')}`}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm leading-5 text-muted-foreground">
                  Aucun article sous {LOW_ARTICLE_STOCK} unités.
                </p>
              )}
            </Panel>
          ) : null}

          {userCanViewStock ? (
            <Panel
              title="Matières et DLC à surveiller"
              footer="Matières sous leur seuil et lots à moins de 3 jours de leur DLC."
            >
              {stockAlerts.length > 0 ? (
                <ul className="flex flex-col gap-4">
                  {stockAlerts.map((alert) => (
                    <li key={alert.id}>
                      <Link
                        href={alert.href}
                        className="text-sm leading-5 hover:underline"
                      >
                        {alert.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm leading-5 text-muted-foreground">
                  Rien d’urgent : aucun seuil critique ni lot proche de sa DLC.
                </p>
              )}
            </Panel>
          ) : null}
        </div>
      ) : null}

      {/* Shop analytics move to the dedicated Statistiques page in a later lot. */}
      {userCanViewShopAnalytics ? <AnalyticsDashboard /> : null}
    </PageContainer>
  )
}
