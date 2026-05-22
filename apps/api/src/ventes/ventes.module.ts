import { Module } from '@nestjs/common'
import { VentesController } from './ventes.controller'
import { VentesService } from './ventes.service'

@Module({
  controllers: [VentesController],
  providers: [VentesService],
})
export class VentesModule {}
