import { getTrustedProxiesFromEnv } from './trusted-proxies'

describe('getTrustedProxiesFromEnv', () => {
  it('disables proxy trust by default', () => {
    expect(getTrustedProxiesFromEnv({})).toEqual([])
  })

  it('accepts explicit IPv4, IPv6 and CIDR entries', () => {
    expect(
      getTrustedProxiesFromEnv({
        TRUSTED_PROXIES: '127.0.0.1, ::1, 172.30.0.2/32, 2001:db8::/64',
      }),
    ).toEqual(['127.0.0.1', '::1', '172.30.0.2/32', '2001:db8::/64'])
  })

  it.each([
    'true',
    'loopback',
    '127.0.0.1/33',
    '2001:db8::/129',
    '1',
    '127.0.0.1,',
  ])('rejects invalid proxy configuration %s', (value) => {
    expect(() => getTrustedProxiesFromEnv({ TRUSTED_PROXIES: value })).toThrow(
      'Invalid TRUSTED_PROXIES entry',
    )
  })
})
