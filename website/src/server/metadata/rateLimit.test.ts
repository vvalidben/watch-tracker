import { afterEach, describe, expect, it, vi } from 'vitest'
import { withRateLimit } from './rateLimit'
import type { MediaSearchProvider } from './provider'

afterEach(() => {
  vi.useRealTimers()
})

describe('withRateLimit', () => {
  it('spaces out consecutive calls by at least the configured interval', async () => {
    vi.useFakeTimers()
    const callTimes: number[] = []
    const provider: MediaSearchProvider = {
      source: 'tmdb',
      supportedTypes: ['movie'],
      search: vi.fn(async () => {
        callTimes.push(Date.now())
        return []
      }),
      getDetails: vi.fn(),
      getSeasons: vi.fn(),
      getEpisodes: vi.fn()
    }
    const limited = withRateLimit(provider, 100)

    const calls = Promise.all([
      limited.search('a', 'movie'),
      limited.search('b', 'movie'),
      limited.search('c', 'movie')
    ])
    await vi.runAllTimersAsync()
    await calls

    expect(callTimes).toHaveLength(3)
    expect(callTimes[1] - callTimes[0]).toBeGreaterThanOrEqual(100)
    expect(callTimes[2] - callTimes[1]).toBeGreaterThanOrEqual(100)
  })

  it('keeps serving later calls after an earlier call throws', async () => {
    const provider: MediaSearchProvider = {
      source: 'tmdb',
      supportedTypes: ['movie'],
      search: vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce([]),
      getDetails: vi.fn(),
      getSeasons: vi.fn(),
      getEpisodes: vi.fn()
    }
    const limited = withRateLimit(provider, 0)

    await expect(limited.search('a', 'movie')).rejects.toThrow('boom')
    await expect(limited.search('b', 'movie')).resolves.toEqual([])
  })
})
