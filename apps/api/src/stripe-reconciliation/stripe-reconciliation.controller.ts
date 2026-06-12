import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common'
import { BetterAuthGuard } from '../auth/better-auth.guard'
import { ROLES } from '../auth/roles'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { ListStripeReconciliationsDto } from './dto/list-stripe-reconciliations.dto'
import { ManualResolveStripeReconciliationDto } from './dto/manual-resolve-stripe-reconciliation.dto'
import { StripeReconciliationService } from './stripe-reconciliation.service'

@Controller('stripe-reconciliations')
@UseGuards(BetterAuthGuard, RolesGuard)
@Roles(ROLES.GERANT)
export class StripeReconciliationController {
  constructor(
    private readonly reconciliationService: StripeReconciliationService,
  ) {}

  @Get()
  list(@Query() query: ListStripeReconciliationsDto) {
    return this.reconciliationService.listReconciliations(query)
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.reconciliationService.getReconciliation(id)
  }

  @Post(':id/retry')
  retry(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: { userId?: string },
  ) {
    return this.reconciliationService.retryReconciliation(id, request.userId)
  }

  @Post(':id/manual-resolution')
  resolveManually(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ManualResolveStripeReconciliationDto,
    @Req() request: { userId?: string },
  ) {
    return this.reconciliationService.resolveManually(
      id,
      body.justification,
      request.userId,
    )
  }
}
