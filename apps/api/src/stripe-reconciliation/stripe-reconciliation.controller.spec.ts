import { StripeReconciliationController } from './stripe-reconciliation.controller'
import { StripeReconciliationService } from './stripe-reconciliation.service'

describe('StripeReconciliationController', () => {
  const listReconciliations = jest.fn()
  const getReconciliation = jest.fn()
  const retryReconciliation = jest.fn()
  const resolveManually = jest.fn()
  const service = {
    listReconciliations,
    getReconciliation,
    retryReconciliation,
    resolveManually,
  } as unknown as StripeReconciliationService
  const controller = new StripeReconciliationController(service)

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('lists reconciliations', async () => {
    listReconciliations.mockResolvedValue({ items: [] })

    await expect(controller.list({ status: 'pending' })).resolves.toEqual({
      items: [],
    })
  })

  it('gets a reconciliation', async () => {
    getReconciliation.mockResolvedValue({ id: 1 })

    await expect(controller.get(1)).resolves.toEqual({ id: 1 })
  })

  it('retries a reconciliation with the current user', async () => {
    retryReconciliation.mockResolvedValue({ id: 1 })

    await controller.retry(1, { userId: 'user-1' })

    expect(retryReconciliation).toHaveBeenCalledWith(1, 'user-1')
  })

  it('resolves a reconciliation with the current user', async () => {
    resolveManually.mockResolvedValue({ id: 1 })

    await controller.resolveManually(
      1,
      { justification: 'Refund handled in Stripe' },
      { userId: 'user-1' },
    )

    expect(resolveManually).toHaveBeenCalledWith(
      1,
      'Refund handled in Stripe',
      'user-1',
    )
  })
})
