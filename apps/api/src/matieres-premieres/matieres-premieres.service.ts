import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateMatierePremiereDto } from './dto/create-matiere-premiere.dto'
import { UpdateMatierePremiereDto } from './dto/update-matiere-premiere.dto'

@Injectable()
export class MatieresPremieresService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.matierePremiere.findMany({
      orderBy: {
        nom: 'asc',
      },
    })
  }

  findOne(id: number) {
    return this.prisma.matierePremiere.findUniqueOrThrow({
      where: { id },
    })
  }

  create(data: CreateMatierePremiereDto) {
    return this.prisma.matierePremiere.create({
      data: {
        nom: data.nom,
        stock: 0,
        unite: data.unite,
        coutUnitaireCents: data.coutUnitaireCents,
        seuil: data.seuil,
        conditionnement: data.conditionnement,
      },
    })
  }

  update(id: number, data: UpdateMatierePremiereDto) {
    return this.prisma.matierePremiere.update({
      where: { id },
      data: {
        nom: data.nom,
        unite: data.unite,
        coutUnitaireCents: data.coutUnitaireCents,
        seuil: data.seuil,
        conditionnement: data.conditionnement,
      },
    })
  }

  remove(id: number) {
    return this.prisma.matierePremiere.delete({
      where: { id },
    })
  }
}
