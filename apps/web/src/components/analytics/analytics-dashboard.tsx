'use client'

import {
  analyticsPeriodLabels,
  formatAnalyticsNumber,
  formatAnalyticsPercentage,
  type AnalyticsOverview,
  type AnalyticsPeriodKey,
} from '@/lib/analytics'
import { useEffect, useState } from 'react'

const periodKeys: AnalyticsPeriodKey[] = ['daily', 'weekly', 'monthly']

export default function AnalyticsDashboard() {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null)
  const [period, setPeriod] = useState<AnalyticsPeriodKey>('daily')
  const [error, setError] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    void fetch('/api/admin/analytics/overview', {
      cache: 'no-store',
      credentials: 'same-origin',
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Analytics request failed')
        }

        return response.json() as Promise<AnalyticsOverview>
      })
      .then(setOverview)
      .catch((requestError: unknown) => {
        if (!(
          requestError instanceof DOMException &&
          requestError.name === 'AbortError'
        )) {
          setError(true)
        }
      })

    return () => controller.abort()
  }, [])

  if (error) {
    return (
      <section className="lc-analytics-panel lc-section-spaced" role="status">
        <div>
          <h2>Audience et conversion</h2>
          <p>
            Les statistiques ne sont pas disponibles pour le moment. Les autres
            fonctions du tableau de bord restent accessibles.
          </p>
        </div>
      </section>
    )
  }

  if (!overview) {
    return <AnalyticsSkeleton />
  }

  const values = overview.periods[period]
  const metrics = [
    {
      label: 'Visites',
      value: formatAnalyticsNumber(values.visits),
      detail: 'Sessions de navigation',
    },
    {
      label: 'Visiteurs uniques',
      value: formatAnalyticsNumber(values.uniqueVisitors),
      detail: 'Navigateurs anonymes distincts',
    },
    {
      label: 'Commandes prises',
      value: formatAnalyticsNumber(values.orders),
      detail:
        values.unattributedOrders > 0
          ? `${formatAnalyticsNumber(values.unattributedOrders)} sans attribution`
          : 'Toutes les commandes sont attribuées',
    },
    {
      label: 'Acheteurs uniques',
      value: formatAnalyticsNumber(values.uniqueBuyers),
      detail: 'Visiteurs ayant confirmé une commande',
    },
    {
      label: 'Taux de conversion',
      value: formatAnalyticsPercentage(values.conversionRate),
      detail: 'Acheteurs uniques / visiteurs uniques',
      primary: true,
    },
  ]

  return (
    <section
      className="lc-analytics-panel lc-section-spaced"
      aria-labelledby="analytics-title"
    >
      <div className="lc-analytics-header">
        <div>
          <h2 id="analytics-title">Audience et conversion</h2>
          <p>
            Mesure first-party consentie, agrégée dans le fuseau Europe/Paris.
          </p>
        </div>

        <div
          className="lc-period-selector"
          aria-label="Période des statistiques"
        >
          {periodKeys.map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={period === key}
              onClick={() => setPeriod(key)}
            >
              {analyticsPeriodLabels[key]}
            </button>
          ))}
        </div>
      </div>

      <div className="lc-analytics-metrics" aria-live="polite">
        {metrics.map((metric) => (
          <article
            key={metric.label}
            className={
              metric.primary
                ? 'lc-analytics-metric primary'
                : 'lc-analytics-metric'
            }
          >
            <p>{metric.label}</p>
            <strong>{metric.value}</strong>
            <span>{metric.detail}</span>
          </article>
        ))}
      </div>

      {values.visits === 0 && values.orders === 0 ? (
        <p className="lc-analytics-empty">
          Pas encore assez de données sur cette période. Le suivi commencera
          après consentement des visiteurs.
        </p>
      ) : null}
    </section>
  )
}

function AnalyticsSkeleton() {
  return (
    <section
      className="lc-analytics-panel lc-section-spaced"
      aria-label="Chargement des statistiques"
      aria-busy="true"
    >
      <div className="lc-analytics-skeleton heading" />
      <div className="lc-analytics-skeleton-grid">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="lc-analytics-skeleton metric" />
        ))}
      </div>
    </section>
  )
}
