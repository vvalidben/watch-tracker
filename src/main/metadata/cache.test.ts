import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { withCache } from './cache'
import type { MediaSearchProvider } from './provider'
import type { NormalizedMedia } from '@shared/metadata'

function makeResult(title: string): NormalizedMedia {
  return {
    externalId: '1',
    source: 'tmdb',
    mediaType: 'movie',
    title,
    originalTitle: null,
    poster: null,
    backdrop: null,
    description: null,
    releaseDate: null,
    status: null,
    genres: [],
    rating: null,
    numberOfSeasons: null,
    numberOfEpisodes: null
  }
}

function makeProvider(overrides: Partial<MediaSearchProvider>): MediaSearchProvider {
  return {
    source: 'tmdb',
    supportedTypes: ['movie'],
    search: vi.fn().mockResolvedValue([]),
    getDetails: vi.fn().mockResolvedValue(makeResult('Unused')),
    getSeasons: vi.fn().mockResolvedValue([]),
    getEpisodes: vi.fn().mockResolvedValue([]),
    ...overrides
  }
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('withCache', () => {
  it('serves a repeated identical search from cache instead of calling the provider again', async () => {
    const search = vi.fn().mockResolvedValue([makeResult('Dune')])
    const cached = withCache(makeProvider({ search }), 60_000)

    await cached.search('dune', 'movie')
    await cached.search('dune', 'movie')

    expect(search).toHaveBeenCalledTimes(1)
  })

  it('treats queries as case/whitespace-insensitive cache keys', async () => {
    const search = vi.fn().mockResolvedValue([makeResult('Dune')])
    const cached = withCache(makeProvider({ search }), 60_000)

    await cached.search('Dune', 'movie')
    await cached.search('  dune  ', 'movie')

    expect(search).toHaveBeenCalledTimes(1)
  })

  it('does not share a cache entry across different types or queries', async () => {
    const search = vi.fn().mockResolvedValue([makeResult('Result')])
    const cached = withCache(makeProvider({ supportedTypes: ['movie', 'tv'], search }), 60_000)

    await cached.search('dune', 'movie')
    await cached.search('dune', 'tv')
    await cached.search('other query', 'movie')

    expect(search).toHaveBeenCalledTimes(3)
  })

  it('re-fetches once the TTL has expired', async () => {
    const search = vi.fn().mockResolvedValue([makeResult('Dune')])
    const cached = withCache(makeProvider({ search }), 1_000)

    await cached.search('dune', 'movie')
    vi.advanceTimersByTime(1_001)
    await cached.search('dune', 'movie')

    expect(search).toHaveBeenCalledTimes(2)
  })

  it('caches getDetails independently of search', async () => {
    const getDetails = vi.fn().mockResolvedValue(makeResult('Dune'))
    const cached = withCache(makeProvider({ getDetails }), 60_000)

    await cached.getDetails('438631', 'movie')
    await cached.getDetails('438631', 'movie')

    expect(getDetails).toHaveBeenCalledTimes(1)
  })

  it('coalesces concurrent identical requests into a single provider call', async () => {
    let resolveFetch!: (value: NormalizedMedia[]) => void
    const search = vi.fn().mockReturnValue(new Promise<NormalizedMedia[]>((resolve) => (resolveFetch = resolve)))
    const cached = withCache(makeProvider({ search }), 60_000)

    // Fire two requests for the same key before the first one resolves.
    const first = cached.search('dune', 'movie')
    const second = cached.search('dune', 'movie')
    resolveFetch([makeResult('Dune')])
    const [firstResult, secondResult] = await Promise.all([first, second])

    expect(search).toHaveBeenCalledTimes(1)
    expect(firstResult).toEqual(secondResult)
  })

  it('lets a later request retry after a failed in-flight request, without caching the failure', async () => {
    const search = vi.fn().mockRejectedValueOnce(new Error('network down')).mockResolvedValueOnce([makeResult('Dune')])
    const cached = withCache(makeProvider({ search }), 60_000)

    await expect(cached.search('dune', 'movie')).rejects.toThrow('network down')
    const result = await cached.search('dune', 'movie')

    expect(search).toHaveBeenCalledTimes(2)
    expect(result).toEqual([makeResult('Dune')])
  })

  it('caches getSeasons and getEpisodes independently, keyed by their own arguments', async () => {
    const getSeasons = vi.fn().mockResolvedValue([])
    const getEpisodes = vi.fn().mockResolvedValue([])
    const cached = withCache(makeProvider({ supportedTypes: ['tv'], getSeasons, getEpisodes }), 60_000)

    await cached.getSeasons('1399', 'tv')
    await cached.getSeasons('1399', 'tv')
    await cached.getEpisodes('1399', 'tv', 1)
    await cached.getEpisodes('1399', 'tv', 1)
    await cached.getEpisodes('1399', 'tv', 2)

    expect(getSeasons).toHaveBeenCalledTimes(1)
    expect(getEpisodes).toHaveBeenCalledTimes(2)
  })
})
