import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { AnalyticsIdentityService } from './analytics-identity.service'
import {
  ANALYTICS_TIMEZONE,
  getAnalyticsPeriods,
  type AnalyticsPeriodKey,
} from './analytics-periods'

const SESSION_WINDOW_MS = 30 * 60 * 1_000
const RETENTION_MS = 395 * 24 * 60 * 60 * 1_000
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1_000

export function calculateConversionRate(
  uniqueBuyers: number,
  uniqueVisitors: number,
) {
  return uniqueVisitors === 0 ? 0 : (uniqueBuyers / uniqueVisitors) * 100
}

type OverviewRow = {
  period: AnalyticsPeriodKey
  visits: bigint
  uniqueVisitors: bigint
  orders: bigint
  uniqueBuyers: bigint
  unattributedOrders: bigint
}

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

@Injectable()
export class AnalyticsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AnalyticsService.name)
  private cleanupTimer?: NodeJS.Timeout

  constructor(
    private readonly prisma: PrismaService,
    private readonly identity: AnalyticsIdentityService,
  ) {}

  onModuleInit() {
    void this.cleanupExpiredData()
    this.cleanupTimer = setInterval(
      () => void this.cleanupExpiredData(),
      CLEANUP_INTERVAL_MS,
    )
    this.cleanupTimer.unref()
  }

  onModuleDestroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }
  }

  async trackVisit(visitorIdentifier: string, sessionIdentifier: string) {
    const now = new Date()
    const cutoff = new Date(now.getTime() - SESSION_WINDOW_MS)
    const visitorHash = this.identity.hashIdentifier(visitorIdentifier)
    const sessionHash = this.identity.hashIdentifier(sessionIdentifier)

    return this.prisma.$transaction(async (tx) => {
      const visitor = await tx.analyticsVisitor.upsert({
        where: { visitorHash },
        create: { visitorHash, firstSeenAt: now, lastSeenAt: now },
        update: { lastSeenAt: now },
        select: { id: true },
      })

      await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id"
        FROM "AnalyticsVisitor"
        WHERE "id" = ${visitor.id}
        FOR UPDATE
      `

      const sameSession = await tx.analyticsSession.findUnique({
        where: { sessionHash },
        select: { id: true, visitorId: true },
      })

      if (sameSession && sameSession.visitorId !== visitor.id) {
        throw new BadRequestException('Identifiants analytics invalides')
      }

      if (sameSession) {
        await tx.analyticsSession.update({
          where: { id: sameSession.id },
          data: { lastActivityAt: now },
        })

        return { tracked: false as const, reason: 'active-session' as const }
      }

      const activeSession = await tx.analyticsSession.findFirst({
        where: {
          visitorId: visitor.id,
          lastActivityAt: { gte: cutoff },
        },
        orderBy: { lastActivityAt: 'desc' },
        select: { id: true },
      })

      if (activeSession) {
        await tx.analyticsSession.update({
          where: { id: activeSession.id },
          data: { lastActivityAt: now },
        })

        return { tracked: false as const, reason: 'active-session' as const }
      }

      await tx.analyticsSession.create({
        data: {
          visitorId: visitor.id,
          sessionHash,
          startedAt: now,
          lastActivityAt: now,
        },
      })

      return { tracked: true as const }
    })
  }

  async getOverview(now = new Date()) {
    const periods = getAnalyticsPeriods(now)
    const rows = await this.prisma.$queryRaw<OverviewRow[]>`
      WITH periods(period, from_at, to_at) AS (
        VALUES
          ('daily', ${periods.daily.from}, ${periods.daily.to}),
          ('weekly', ${periods.weekly.from}, ${periods.weekly.to}),
          ('monthly', ${periods.monthly.from}, ${periods.monthly.to})
      ),
      visit_counts AS (
        SELECT
          p.period,
          COUNT(s.id) AS visits,
          COUNT(DISTINCT s."visitorId") AS unique_visitors
        FROM periods p
        LEFT JOIN "AnalyticsSession" s
          ON s."startedAt" >= p.from_at AND s."startedAt" <= p.to_at
        GROUP BY p.period
      ),
      order_counts AS (
        SELECT
          p.period,
          COUNT(c.id) AS orders,
          COUNT(DISTINCT c."analyticsVisitorId") AS unique_buyers,
          COUNT(c.id) FILTER (WHERE c."analyticsVisitorId" IS NULL) AS unattributed_orders
        FROM periods p
        LEFT JOIN "Commande" c
          ON c."confirmedAt" >= p.from_at AND c."confirmedAt" <= p.to_at
        GROUP BY p.period
      )
      SELECT
        v.period,
        v.visits,
        v.unique_visitors AS "uniqueVisitors",
        o.orders,
        o.unique_buyers AS "uniqueBuyers",
        o.unattributed_orders AS "unattributedOrders"
      FROM visit_counts v
      INNER JOIN order_counts o ON o.period = v.period
    `

    const rowByPeriod = new Map(rows.map((row) => [row.period, row]))

    return {
      generatedAt: now.toISOString(),
      timezone: ANALYTICS_TIMEZONE,
      periods: {
        daily: this.toPeriodOverview('daily', periods, rowByPeriod),
        weekly: this.toPeriodOverview('weekly', periods, rowByPeriod),
        monthly: this.toPeriodOverview('monthly', periods, rowByPeriod),
      },
    }
  }

  async cleanupExpiredData(now = new Date()) {
    const cutoff = new Date(now.getTime() - RETENTION_MS)

    try {
      await this.prisma.$transaction([
        this.prisma.analyticsSession.deleteMany({
          where: { lastActivityAt: { lt: cutoff } },
        }),
        this.prisma.analyticsVisitor.deleteMany({
          where: { lastSeenAt: { lt: cutoff } },
        }),
      ])
    } catch (error) {
      this.logger.warn(
        'Expired analytics data cleanup failed',
        error instanceof Error ? error.stack : undefined,
      )
    }
  }

  private toPeriodOverview(
    key: AnalyticsPeriodKey,
    periods: ReturnType<typeof getAnalyticsPeriods>,
    rows: Map<AnalyticsPeriodKey, OverviewRow>,
  ): AnalyticsPeriodOverview {
    const row = rows.get(key)
    const visits = Number(row?.visits ?? 0)
    const uniqueVisitors = Number(row?.uniqueVisitors ?? 0)
    const orders = Number(row?.orders ?? 0)
    const uniqueBuyers = Number(row?.uniqueBuyers ?? 0)
    const unattributedOrders = Number(row?.unattributedOrders ?? 0)

    return {
      from: periods[key].from.toISOString(),
      to: periods[key].to.toISOString(),
      visits,
      uniqueVisitors,
      orders,
      uniqueBuyers,
      conversionRate: calculateConversionRate(uniqueBuyers, uniqueVisitors),
      unattributedOrders,
      averageOrdersPerBuyer:
        uniqueBuyers === 0 ? 0 : (orders - unattributedOrders) / uniqueBuyers,
    }
  }
}
