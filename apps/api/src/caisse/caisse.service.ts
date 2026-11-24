import { ConflictException, Injectable } from '@nestjs/common'
import { Prisma } from '../../prisma/generated/prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import {
  CASH_REGISTER_DAY_ALREADY_CLOSED,
  getParisDayBounds,
  lockCashRegisterDay,
  type DayBounds,
} from './cash-register-day'

type SalesReader = Pick<Prisma.TransactionClient, 'vente'>

type CaisseTotals = {
  totalTtcCents: number
  totalHtCents: number
  tvaCents: number
  especesCents: number
  cbCents: number
  chequesCents: number
  margeCents: number
  nbVentes: number
}

@Injectable()
export class CaisseService {
  constructor(private readonly prisma: PrismaService) {}

  findClosedDays() {
    return this.prisma.journeeCaisse.findMany({
      orderBy: {
        date: 'desc',
      },
    })
  }

  async getTodaySummary() {
    const bounds = getParisDayBounds(new Date())
    const [closedDay, totals] = await Promise.all([
      this.prisma.journeeCaisse.findUnique({
        where: {
          date: bounds.start,
        },
      }),
      this.calculateTotals(bounds),
    ])

    return {
      date: bounds.start,
      dayKey: bounds.dayKey,
      status: closedDay ? 'closed' : 'open',
      closedDay,
      totals: closedDay
        ? {
            totalTtcCents: closedDay.totalTtcCents,
            totalHtCents: closedDay.totalHtCents,
            tvaCents: closedDay.tvaCents,
            especesCents: closedDay.especesCents,
            cbCents: closedDay.cbCents,
            chequesCents: closedDay.chequesCents,
            margeCents: closedDay.margeCents,
            nbVentes: closedDay.nbVentes,
          }
        : totals,
    }
  }

  // Atomic closure: the day lock serializes it with sale creation, and the
  // snapshot is computed and stored inside the same transaction.
  async closeToday() {
    const bounds = getParisDayBounds(new Date())

    try {
      return await this.prisma.$transaction(async (tx) => {
        await lockCashRegisterDay(tx, bounds)

        const alreadyClosed = await tx.journeeCaisse.findUnique({
          where: { date: bounds.start },
          select: { id: true },
        })

        if (alreadyClosed) {
          throw alreadyClosedError()
        }

        const totals = await this.calculateTotals(bounds, tx)

        return tx.journeeCaisse.create({
          data: {
            date: bounds.start,
            ...totals,
          },
        })
      })
    } catch (error) {
      // Safety net: the unique constraint on JourneeCaisse.date still guards
      // against a closure that would bypass the lock.
      if (isUniqueConstraintError(error)) {
        throw alreadyClosedError()
      }

      throw error
    }
  }

  private async calculateTotals(
    bounds: DayBounds,
    client: SalesReader = this.prisma,
  ): Promise<CaisseTotals> {
    const ventes = await client.vente.findMany({
      where: {
        date: {
          gte: bounds.start,
          lt: bounds.end,
        },
      },
      include: {
        lignes: {
          include: {
            article: {
              include: {
                nomen: {
                  include: {
                    mp: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    return ventes.reduce<CaisseTotals>(
      (totals, vente) => {
        const coutMatieres = vente.lignes.reduce((venteCost, ligne) => {
          const coutUnitaireCents = ligne.article.nomen.reduce(
            (lineCost, nomenclatureLine) =>
              lineCost +
              Math.round(
                nomenclatureLine.quantite *
                  nomenclatureLine.mp.coutUnitaireCents,
              ),
            0,
          )

          return venteCost + coutUnitaireCents * ligne.quantite
        }, 0)

        return {
          totalTtcCents: totals.totalTtcCents + vente.totalTtcCents,
          totalHtCents: totals.totalHtCents + vente.totalHtCents,
          tvaCents: totals.tvaCents + vente.tvaCents,
          especesCents:
            totals.especesCents +
            (vente.mode === 'especes' ? vente.totalTtcCents : 0),
          cbCents:
            totals.cbCents + (vente.mode === 'cb' ? vente.totalTtcCents : 0),
          chequesCents:
            totals.chequesCents +
            (vente.mode === 'cheque' ? vente.totalTtcCents : 0),
          margeCents: totals.margeCents + (vente.totalHtCents - coutMatieres),
          nbVentes: totals.nbVentes + 1,
        }
      },
      {
        totalTtcCents: 0,
        totalHtCents: 0,
        tvaCents: 0,
        especesCents: 0,
        cbCents: 0,
        chequesCents: 0,
        margeCents: 0,
        nbVentes: 0,
      },
    )
  }
}

function alreadyClosedError() {
  return new ConflictException({
    code: CASH_REGISTER_DAY_ALREADY_CLOSED,
    message: 'La journée de caisse est déjà clôturée',
  })
}

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  )
}
