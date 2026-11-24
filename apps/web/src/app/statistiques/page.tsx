import {
  Callout,
  KeyFigures,
  PageContainer,
  PageHeading,
  Panel,
} from '@/components/layout/page-layout'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  analyticsPeriodKeys,
  analyticsPeriodLabels,
  formatAnalyticsDecimal,
  formatAnalyticsNumber,
  formatAnalyticsPercentage,
  parseAnalyticsPeriod,
  type AnalyticsOverview,
  type AnalyticsPeriodOverview,
} from '@/lib/analytics'
import { getAnalyticsOverview } from '@/lib/api'
import { requireUiPermission } from '@/lib/auth-session'
import { canViewShopAnalytics } from '@/lib/permissions'
import Link from 'next/link'

type StatistiquesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function plural(count: number, singular: string, pluralForm: string) {
  return `${formatAnalyticsNumber(count)} ${count > 1 ? pluralForm : singular}`
}

export default async function StatistiquesPage({
  searchParams,
}: StatistiquesPageProps) {
  await requireUiPermission(canViewShopAnalytics)
  const params = (await searchParams) ?? {}
  const period = parseAnalyticsPeriod(params.periode)

  let overview: AnalyticsOverview | null = null

  try {
    overview = await getAnalyticsOverview()
  } catch {
    overview = null
  }

  return (
    <PageContainer>
      <PageHeading
        context="Statistiques"
        title="Statistiques"
        description="Audience et commandes de la boutique · accès administrateur"
      />

      <nav
        aria-label="Période des statistiques"
        className="flex flex-wrap gap-3"
      >
        {analyticsPeriodKeys.map((key) => (
          <Button
            key={key}
            asChild
            variant={key === period ? 'default' : 'secondary'}
            className="min-w-40 flex-1 sm:flex-none"
          >
            <Link
              href={key === 'weekly' ? '/statistiques' : `/statistiques?periode=${key}`}
              aria-current={key === period ? 'page' : undefined}
              scroll={false}
            >
              {analyticsPeriodLabels[key]}
            </Link>
          </Button>
        ))}
      </nav>

      {overview ? (
        <AnalyticsContent values={overview.periods[period]} />
      ) : (
        <Callout tone="danger" title="Statistiques indisponibles">
          Les chiffres n’ont pas pu être chargés. Réessayez dans quelques
          instants ; les autres écrans restent accessibles.
        </Callout>
      )}

      <Callout title="Périmètre des montants">
        Les totaux de commandes ne constituent pas un chiffre d’affaires
        encaissé. Les remboursements sont consultables commande par commande.
      </Callout>
    </PageContainer>
  )
}

function AnalyticsContent({ values }: { values: AnalyticsPeriodOverview }) {
  const funnelMax = Math.max(values.uniqueVisitors, values.uniqueBuyers, 1)
  const funnel = [
    { label: 'Visiteurs uniques', value: values.uniqueVisitors },
    { label: 'Acheteurs uniques', value: values.uniqueBuyers },
  ]
  const definitions = [
    {
      label: 'Acheteurs uniques',
      value: formatAnalyticsNumber(values.uniqueBuyers),
      definition: 'Visiteurs ayant confirmé une commande',
    },
    {
      label: 'Commandes sans attribution',
      value: formatAnalyticsNumber(values.unattributedOrders),
      definition: 'Commande non reliée à une visite suivie',
    },
    {
      label: 'Commandes par acheteur',
      value: formatAnalyticsDecimal(values.averageOrdersPerBuyer),
      definition: 'Commandes attribuées / acheteurs uniques',
    },
  ]
  const isEmpty = values.visits === 0 && values.orders === 0

  return (
    <>
      <KeyFigures
        items={[
          {
            label: 'Visites',
            value: formatAnalyticsNumber(values.visits),
            detail: 'Sessions de navigation',
          },
          {
            label: 'Visiteurs uniques',
            value: formatAnalyticsNumber(values.uniqueVisitors),
            detail: 'Navigateurs distincts',
          },
          {
            label: 'Commandes prises',
            value: formatAnalyticsNumber(values.orders),
            detail:
              values.unattributedOrders > 0
                ? `${formatAnalyticsNumber(values.unattributedOrders)} sans attribution`
                : 'Toutes attribuées',
          },
          {
            label: 'Conversion',
            value: formatAnalyticsPercentage(values.conversionRate),
            detail: `${plural(values.uniqueBuyers, 'acheteur', 'acheteurs')} / ${plural(values.uniqueVisitors, 'visiteur', 'visiteurs')}`,
          },
        ]}
      />

      {isEmpty ? (
        <Callout tone="warning" title="Pas encore assez de données">
          Aucune visite ni commande sur cette période. Le suivi ne commence
          qu’après le consentement des visiteurs.
        </Callout>
      ) : null}

      <Panel
        title="Du visiteur à l’acheteur"
        footer="Conversion = acheteurs uniques ÷ visiteurs uniques. Mesure consentie, fuseau Europe/Paris."
      >
        <dl className="flex flex-col gap-4">
          {funnel.map((step) => (
            <div
              key={step.label}
              className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 md:grid-cols-[190px_1fr]"
            >
              <dt className="text-sm leading-5 font-medium">{step.label}</dt>
              <dd className="contents">
                <span className="col-span-2 flex items-center gap-4 md:col-span-1">
                  <span
                    aria-hidden="true"
                    className="h-[30px] rounded-sm bg-primary"
                    style={{
                      width: `${Math.max((step.value / funnelMax) * 100, step.value > 0 ? 2 : 0)}%`,
                    }}
                  />
                  <span className="text-sm leading-5 font-medium">
                    {formatAnalyticsNumber(step.value)}
                  </span>
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </Panel>

      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[320px]">Indicateur</TableHead>
              <TableHead className="w-[180px]">Valeur</TableHead>
              <TableHead>Définition</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {definitions.map((row) => (
              <TableRow key={row.label}>
                <TableCell className="font-medium">{row.label}</TableCell>
                <TableCell className="text-muted-foreground tabular-nums">
                  {row.value}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {row.definition}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <dl className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6 md:hidden">
        {definitions.map((row) => (
          <div key={row.label} className="flex flex-col gap-1">
            <dt className="text-sm leading-5 font-medium">
              {row.label} · {row.value}
            </dt>
            <dd className="text-xs leading-[17px] text-muted-foreground">
              {row.definition}
            </dd>
          </div>
        ))}
      </dl>
    </>
  )
}
