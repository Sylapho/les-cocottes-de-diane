import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createHmac } from 'node:crypto'
import { PrismaService } from '../prisma/prisma.service'

export type AnalyticsAttribution = {
  visitorId: string
  sessionId?: string
}

@Injectable()
export class AnalyticsIdentityService {
  private readonly logger = new Logger(AnalyticsIdentityService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  hashIdentifier(identifier: string) {
    const secret = this.config.get<string>('ANALYTICS_HASH_SECRET')

    if (!secret || secret.length < 32) {
      throw new ServiceUnavailableException('Analytics indisponible')
    }

    return createHmac('sha256', secret).update(identifier).digest('hex')
  }

  async resolveAttributionBestEffort(
    visitorId?: string,
    sessionId?: string,
  ): Promise<AnalyticsAttribution | null> {
    if (!visitorId) {
      return null
    }

    try {
      const now = new Date()
      const visitorHash = this.hashIdentifier(visitorId)
      const sessionHash = sessionId ? this.hashIdentifier(sessionId) : undefined
      const visitor = await this.prisma.analyticsVisitor.upsert({
        where: { visitorHash },
        create: { visitorHash, firstSeenAt: now, lastSeenAt: now },
        update: { lastSeenAt: now },
        select: { id: true },
      })
      const session = sessionHash
        ? await this.prisma.analyticsSession.findUnique({
            where: { sessionHash },
            select: { id: true, visitorId: true },
          })
        : null

      if (session && session.visitorId === visitor.id) {
        await this.prisma.analyticsSession.update({
          where: { id: session.id },
          data: { lastActivityAt: now },
        })
      }

      return {
        visitorId: visitor.id,
        sessionId:
          session && session.visitorId === visitor.id ? session.id : undefined,
      }
    } catch (error) {
      this.logger.warn(
        'Anonymous analytics attribution was skipped',
        error instanceof Error ? error.stack : undefined,
      )
      return null
    }
  }
}
