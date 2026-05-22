import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { PrismaModule } from './prisma/prisma.module'
import { ArticlesModule } from './articles/articles.module'
import { MatieresPremieresModule } from './matieres-premieres/matieres-premieres.module'
import { NomenclatureModule } from './nomenclatures/nomenclature.module'
import { VentesModule } from './ventes/ventes.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    ArticlesModule,
    MatieresPremieresModule,
    NomenclatureModule,
    VentesModule,
  ],
})
export class AppModule {}