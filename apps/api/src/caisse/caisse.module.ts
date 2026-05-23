import { Module } from '@nestjs/common'
import { CaisseController } from './caisse.controller'
import { CaisseService } from './caisse.service'

@Module({
  controllers: [CaisseController],
  providers: [CaisseService],
})
export class CaisseModule {}
