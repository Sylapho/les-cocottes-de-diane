export type AnalyticsPeriodKey = 'daily' | 'weekly' | 'monthly'

export type AnalyticsPeriodOverview = {
  from: string
  to: string
  visits: number
  uniqueVisitors: number
  orders: number
  uniqueBuyers: number
  conversionRate: number
  unattributedOrders: number
  averageOrdersPerBuyer: number
}

export type AnalyticsOverview = {
  generatedAt: string
  timezone: 'Europe/Paris'
  periods: Record<AnalyticsPeriodKey, AnalyticsPeriodOverview>
}

export const analyticsPeriodLabels: Record<AnalyticsPeriodKey, string> = {
  daily: 'Aujourd’hui',
  weekly: '7 derniers jours',
  monthly: '30 derniers jours',
}

export function formatAnalyticsNumber(value: number) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(
    value,
  )
}

export function formatAnalyticsPercentage(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100)
}
