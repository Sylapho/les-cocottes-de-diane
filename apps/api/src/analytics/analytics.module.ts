import { Module } from '@nestjs/common'
import { AnalyticsController } from './analytics.controller'
import { AnalyticsIdentityService } from './analytics-identity.service'
import { AnalyticsService } from './analytics.service'

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsIdentityService, AnalyticsService],
  exports: [AnalyticsIdentityService],
})
export class AnalyticsModule {}
