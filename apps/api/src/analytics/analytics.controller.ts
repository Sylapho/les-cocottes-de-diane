import { Body, Controller, Get, Header, Post, UseGuards } from '@nestjs/common'
import { BetterAuthGuard } from '../auth/better-auth.guard'
import { ROLES } from '../auth/roles'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { AnalyticsService } from './analytics.service'
import { TrackVisitDto } from './dto/track-visit.dto'

@Controller()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('analytics/visits')
  trackVisit(@Body() body: TrackVisitDto) {
    return this.analyticsService.trackVisit(body.visitorId, body.sessionId)
  }

  @Get('admin/analytics/overview')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles(ROLES.ADMIN)
  @Header('Cache-Control', 'private, no-store, max-age=0')
  getOverview() {
    return this.analyticsService.getOverview()
  }
}
