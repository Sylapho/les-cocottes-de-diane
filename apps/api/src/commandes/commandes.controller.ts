import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
import { BetterAuthGuard } from '../auth/better-auth.guard'
import { ROLES } from '../auth/roles'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { CommandesService } from './commandes.service'
import { CreateCommandeDto } from './dto/create-commande.dto'
import { UpdateCommandeStatutDto } from './dto/update-commande-statut.dto'

@Controller('commandes')
export class CommandesController {
  constructor(private readonly commandesService: CommandesService) {}

  @Post()
  create(@Body() body: CreateCommandeDto) {
    return this.commandesService.create(body)
  }

  @Get()
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles(ROLES.GERANT, ROLES.VENDEUR, ROLES.PRODUCTION, ROLES.COMPTABLE)
  findAll() {
    return this.commandesService.findAll()
  }

  @Get(':id')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles(ROLES.GERANT, ROLES.VENDEUR, ROLES.PRODUCTION, ROLES.COMPTABLE)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.commandesService.findOne(id)
  }

  @Patch(':id/statut')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles(ROLES.GERANT, ROLES.VENDEUR, ROLES.PRODUCTION)
  updateStatut(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateCommandeStatutDto,
  ) {
    return this.commandesService.updateStatut(id, body.statut)
  }
}
