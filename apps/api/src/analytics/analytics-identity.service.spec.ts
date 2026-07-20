import { ConfigService } from '@nestjs/config'
import { ServiceUnavailableException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { AnalyticsIdentityService } from './analytics-identity.service'

describe('AnalyticsIdentityService', () => {
  const prismaMock = {
    analyticsVisitor: {
      upsert: jest.fn(),
    },
    analyticsSession: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  }
  const configMock = {
    get: jest.fn(),
  }

  let service: AnalyticsIdentityService

  beforeEach(() => {
    jest.clearAllMocks()
    configMock.get.mockReturnValue('a'.repeat(32))
    service = new AnalyticsIdentityService(
      prismaMock as unknown as PrismaService,
      configMock as unknown as ConfigService,
    )
  })

  it('hashes identifiers deterministically with the configured secret', () => {
    expect(service.hashIdentifier('visitor-1')).toBe(
      service.hashIdentifier('visitor-1'),
    )
    expect(service.hashIdentifier('visitor-1')).not.toBe(
      service.hashIdentifier('visitor-2'),
    )
  })

  it('rejects analytics when the hash secret is missing or too short', () => {
    configMock.get.mockReturnValue('short')

    expect(() => service.hashIdentifier('visitor-1')).toThrow(
      ServiceUnavailableException,
    )
  })

  it('resolves a matching visitor and session attribution', async () => {
    prismaMock.analyticsVisitor.upsert.mockResolvedValue({ id: 'visitor-db' })
    prismaMock.analyticsSession.findUnique.mockResolvedValue({
      id: 'session-db',
      visitorId: 'visitor-db',
    })
    prismaMock.analyticsSession.update.mockResolvedValue({})

    await expect(
      service.resolveAttributionBestEffort('visitor-1', 'session-1'),
    ).resolves.toEqual({
      visitorId: 'visitor-db',
      sessionId: 'session-db',
    })
    expect(prismaMock.analyticsSession.update).toHaveBeenCalledWith({
      where: { id: 'session-db' },
      data: { lastActivityAt: expect.any(Date) as Date },
    })
  })

  it('returns null when attribution cannot be resolved', async () => {
    prismaMock.analyticsVisitor.upsert.mockRejectedValue(
      new Error('database unavailable'),
    )

    await expect(
      service.resolveAttributionBestEffort('visitor-1'),
    ).resolves.toBeNull()
    await expect(service.resolveAttributionBestEffort()).resolves.toBeNull()
  })
})
