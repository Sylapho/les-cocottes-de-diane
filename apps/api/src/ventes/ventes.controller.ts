import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common'
import { VentesService } from './ventes.service'
import { CreateVenteDto } from './dto/create-vente.dto'

@Controller('ventes')
export class VentesController {
  constructor(private readonly ventesService: VentesService) {}

  @Get()
  findAll() {
    return this.ventesService.findAll()
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ventesService.findOne(id)
  }

  @Post()
  create(@Body() body: CreateVenteDto) {
    return this.ventesService.create(body)
  }
}