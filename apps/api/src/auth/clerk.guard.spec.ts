import { ExecutionContext, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createClerkClient } from '@clerk/backend'
import { ClerkGuard } from './clerk.guard'

jest.mock('@clerk/backend', () => ({
  createClerkClient: jest.fn(),
}))

type TestRequest = {
  headers: {
    authorization?: string
  }
  userId?: string
  userRole?: string
}

describe('ClerkGuard', () => {
  const verifyToken = jest.fn()
  const configMock = {
    get: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    configMock.get.mockReturnValue('test-secret')
    ;(createClerkClient as jest.Mock).mockReturnValue({
      verifyToken,
    })
  })

  function createContext(request: TestRequest): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext
  }

  it('should create a Clerk client with configured secret key', () => {
    new ClerkGuard(configMock as unknown as ConfigService)

    expect(createClerkClient).toHaveBeenCalledWith({
      secretKey: 'test-secret',
    })
  })

  it('should reject missing bearer token', async () => {
    const guard = new ClerkGuard(configMock as unknown as ConfigService)
    const request: TestRequest = {
      headers: {},
    }

    await expect(guard.canActivate(createContext(request))).rejects.toBeInstanceOf(
      UnauthorizedException,
    )
    expect(verifyToken).not.toHaveBeenCalled()
  })

  it('should verify token and attach user metadata to request', async () => {
    const guard = new ClerkGuard(configMock as unknown as ConfigService)
    const request: TestRequest = {
      headers: {
        authorization: 'Bearer valid-token',
      },
    }

    verifyToken.mockResolvedValue({
      sub: 'user_123',
      publicMetadata: {
        role: 'gerant',
      },
    })

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true)
    expect(verifyToken).toHaveBeenCalledWith('valid-token')
    expect(request.userId).toBe('user_123')
    expect(request.userRole).toBe('gerant')
  })

  it('should default role to vendeur when token has no role metadata', async () => {
    const guard = new ClerkGuard(configMock as unknown as ConfigService)
    const request: TestRequest = {
      headers: {
        authorization: 'Bearer valid-token',
      },
    }

    verifyToken.mockResolvedValue({
      sub: 'user_123',
      publicMetadata: {},
    })

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true)
    expect(request.userRole).toBe('vendeur')
  })

  it('should reject invalid tokens', async () => {
    const guard = new ClerkGuard(configMock as unknown as ConfigService)
    const request: TestRequest = {
      headers: {
        authorization: 'Bearer invalid-token',
      },
    }

    verifyToken.mockRejectedValue(new Error('invalid'))

    await expect(guard.canActivate(createContext(request))).rejects.toBeInstanceOf(
      UnauthorizedException,
    )
  })
})
