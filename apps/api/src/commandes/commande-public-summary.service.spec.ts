import { CommandePublicSummaryService } from './commande-public-summary.service'

describe('CommandePublicSummaryService', () => {
  const service = new CommandePublicSummaryService()

  const makeCommande = (statut: string, dateRetrait: Date | null = null) => ({
    id: 42,
    trackingToken: 'tracking-token',
    totalTtcCents: 1250,
    lieu: 'Marché de Gaillon',
    dateRetrait,
    statut,
    createdAt: new Date('2026-07-10T08:00:00.000Z'),
    lignes: [
      {
        quantite: 2,
        prixUnitCents: 625,
        article: { nom: 'Terrine de volaille' },
      },
    ],
  })

  it('exposes only the public order fields and computes line totals', () => {
    const summary = service.toPublicCommandeSummary(
      makeCommande('nouvelle', new Date('2026-07-14T08:00:00.000Z')),
    )

    expect(summary).toEqual({
      trackingToken: 'tracking-token',
      reference: 'CMD-000042',
      totalTtcCents: 1250,
      lieu: 'Marché de Gaillon',
      dateRetrait: '2026-07-14T08:00:00.000Z',
      statut: 'nouvelle',
      paiementStatut: 'confirme',
      createdAt: '2026-07-10T08:00:00.000Z',
      lignes: [
        {
          nom: 'Terrine de volaille',
          quantite: 2,
          prixUnitCents: 625,
          totalCents: 1250,
        },
      ],
    })
  })

  it.each([
    ['annulee', 'annule'],
    ['paiement_en_attente', 'en_attente'],
    ['paiement_a_verifier', 'a_verifier'],
    ['preparee', 'confirme'],
  ] as const)('maps %s to the public payment status %s', (statut, expected) => {
    expect(service.toPublicCommandeSummary(makeCommande(statut))).toMatchObject(
      {
        dateRetrait: null,
        paiementStatut: expected,
      },
    )
  })
})
