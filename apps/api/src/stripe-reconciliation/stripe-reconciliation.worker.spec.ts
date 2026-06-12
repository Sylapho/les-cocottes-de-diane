import { StripeReconciliationService } from './stripe-reconciliation.service'
import { StripeReconciliationWorker } from './stripe-reconciliation.worker'

describe('StripeReconciliationWorker', () => {
  afterEach(() => {
    jest.useRealTimers()
  })

  it('does not start when disabled', () => {
    const processDueReconciliations = jest.fn()
    const service = {
      workerEnabled: false,
      workerIntervalMs: 1000,
      processDueReconciliations,
    } as unknown as StripeReconciliationService
    const worker = new StripeReconciliationWorker(service)

    worker.onModuleInit()

    expect(processDueReconciliations).not.toHaveBeenCalled()
  })

  it('starts and stops the periodic worker when enabled', async () => {
    jest.useFakeTimers()
    const processDueReconciliations = jest
      .fn()
      .mockResolvedValue({ claimed: 0 })
    const service = {
      workerEnabled: true,
      workerIntervalMs: 1000,
      processDueReconciliations,
    } as unknown as StripeReconciliationService
    const worker = new StripeReconciliationWorker(service)

    worker.onModuleInit()
    await Promise.resolve()

    expect(processDueReconciliations).toHaveBeenCalledTimes(1)

    jest.advanceTimersByTime(1000)
    await Promise.resolve()

    expect(processDueReconciliations).toHaveBeenCalledTimes(2)

    worker.onModuleDestroy()
  })
})
