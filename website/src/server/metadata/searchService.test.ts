import { describe, expect, it, vi } from 'vitest'
import { createMediaSearchService } from './searchService'
import { ProviderError } from './errors'
import type { MediaSearchProvider } from './provider'
import type { NormalizedMedia } from '@shared/metadata'

function makeResult(overrides: Partial<NormalizedMedia> = {}): NormalizedMedia {
  return {
    externalId: '1',
    source: 'tmdb',
    mediaType: 'movie',
    title: 'Test Movie',
    originalTitle: null,
    poster: null,
    backdrop: null,
    description: null,
    releaseDate: null,
    status: null,
    genres: [],
    rating: null,
    numberOfSeasons: null,
    numberOfEpisodes: null,
    ...overrides
  }
}

function makeProvider(overrides: Partial<MediaSearchProvider>): MediaSearchProvider {
  return {
    source: 'tmdb',
    supportedTypes: ['movie', 'tv'],
    search: vi.fn().mockResolvedValue([]),
    getDetails: vi.fn().mockResolvedValue(makeResult()),
    getSeasons: vi.fn().mockResolvedValue([]),
    getEpisodes: vi.fn().mockResolvedValue([]),
    ...overrides
  }
}

describe('createMediaSearchService', () => {
  it('merges results from every provider that covers a requested type', async () => {
    const tmdb = makeProvider({
      source: 'tmdb',
      supportedTypes: ['movie', 'tv'],
      search: vi.fn().mockResolvedValue([makeResult({ source: 'tmdb', mediaType: 'movie', title: 'Dune' })])
    })
    const anilist = makeProvider({
      source: 'anilist',
      supportedTypes: ['anime'],
      search: vi.fn().mockResolvedValue([
        makeResult({ source: 'anilist', mediaType: 'anime', title: 'Frieren', externalId: '2' })
      ])
    })
    const service = createMediaSearchService([tmdb, anilist])

    const response = await service.search('query', ['movie', 'anime'])

    expect(response.errors).toEqual([])
    expect(response.results.map((r) => r.title).sort()).toEqual(['Dune', 'Frieren'])
    expect(tmdb.search).toHaveBeenCalledWith('query', 'movie')
    expect(tmdb.search).not.toHaveBeenCalledWith('query', 'tv')
    expect(anilist.search).toHaveBeenCalledWith('query', 'anime')
  })

  it('only queries providers for the requested types', async () => {
    const tmdb = makeProvider({ source: 'tmdb', supportedTypes: ['movie', 'tv'] })
    const anilist = makeProvider({ source: 'anilist', supportedTypes: ['anime'] })
    const service = createMediaSearchService([tmdb, anilist])

    await service.search('query', ['anime'])

    expect(tmdb.search).not.toHaveBeenCalled()
    expect(anilist.search).toHaveBeenCalledWith('query', 'anime')
  })

  it('tolerates one provider failing: still returns the other provider\'s results plus an error entry', async () => {
    const tmdb = makeProvider({
      source: 'tmdb',
      supportedTypes: ['movie', 'tv'],
      search: vi.fn().mockRejectedValue(new ProviderError('network', 'TMDB is unreachable'))
    })
    const anilist = makeProvider({
      source: 'anilist',
      supportedTypes: ['anime'],
      search: vi.fn().mockResolvedValue([makeResult({ source: 'anilist', mediaType: 'anime', title: 'Frieren' })])
    })
    const service = createMediaSearchService([tmdb, anilist])

    const response = await service.search('query')

    expect(response.results).toHaveLength(1)
    expect(response.results[0].title).toBe('Frieren')
    expect(response.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: 'tmdb', code: 'network', message: 'TMDB is unreachable' })
      ])
    )
  })

  it('reports a missing_config error, without calling any provider, when nothing covers a type', async () => {
    const anilist = makeProvider({ source: 'anilist', supportedTypes: ['anime'] })
    const service = createMediaSearchService([anilist])

    const response = await service.search('query', ['movie'])

    expect(response.results).toEqual([])
    expect(response.errors).toEqual([
      { source: 'tmdb', code: 'missing_config', message: expect.stringContaining('movie') }
    ])
    expect(anilist.search).not.toHaveBeenCalled()
  })

  it('getDetails routes to the provider matching the requested source', async () => {
    const tmdb = makeProvider({
      source: 'tmdb',
      getDetails: vi.fn().mockResolvedValue(makeResult({ title: 'Dune Details' }))
    })
    const anilist = makeProvider({ source: 'anilist', supportedTypes: ['anime'] })
    const service = createMediaSearchService([tmdb, anilist])

    const response = await service.getDetails('tmdb', 'movie', '438631')

    expect(response.error).toBeNull()
    expect(response.result?.title).toBe('Dune Details')
    expect(tmdb.getDetails).toHaveBeenCalledWith('438631', 'movie')
    expect(anilist.getDetails).not.toHaveBeenCalled()
  })

  it('getDetails returns a typed error instead of throwing when the provider call fails', async () => {
    const tmdb = makeProvider({
      source: 'tmdb',
      getDetails: vi.fn().mockRejectedValue(new ProviderError('unknown', 'Not found'))
    })
    const service = createMediaSearchService([tmdb])

    const response = await service.getDetails('tmdb', 'movie', '999')

    expect(response.result).toBeNull()
    expect(response.error).toEqual({ source: 'tmdb', code: 'unknown', message: 'Not found' })
  })

  it('getDetails reports missing_config when no provider matches the source', async () => {
    const service = createMediaSearchService([])

    const response = await service.getDetails('anilist', 'anime', '1')

    expect(response.result).toBeNull()
    expect(response.error).toMatchObject({ source: 'anilist', code: 'missing_config' })
  })

  it('getSeasons and getEpisodes route to the provider matching the source', async () => {
    const tmdb = makeProvider({
      source: 'tmdb',
      getSeasons: vi.fn().mockResolvedValue([{ seasonNumber: 1, title: 'S1', overview: null, poster: null, airDate: null, episodeCount: 10 }]),
      getEpisodes: vi.fn().mockResolvedValue([{ episodeNumber: 1, title: 'Pilot', overview: null, airDate: null, runtimeMinutes: 42 }])
    })
    const service = createMediaSearchService([tmdb])

    const seasons = await service.getSeasons('tmdb', 'tv', '1399')
    const episodes = await service.getEpisodes('tmdb', 'tv', '1399', 1)

    expect(seasons.error).toBeNull()
    expect(seasons.seasons).toHaveLength(1)
    expect(episodes.error).toBeNull()
    expect(episodes.episodes[0].title).toBe('Pilot')
    expect(tmdb.getSeasons).toHaveBeenCalledWith('1399', 'tv')
    expect(tmdb.getEpisodes).toHaveBeenCalledWith('1399', 'tv', 1)
  })

  it('getSeasons reports missing_config when no provider matches the source', async () => {
    const service = createMediaSearchService([])

    const response = await service.getSeasons('tmdb', 'tv', '1')

    expect(response.seasons).toEqual([])
    expect(response.error).toMatchObject({ source: 'tmdb', code: 'missing_config' })
  })
})
