import { afterEach, describe, expect, it, vi } from 'vitest'
import { createTmdbProvider } from './tmdbProvider'

/**
 * Integration-level tests: does the provider wire tmdbClient + tmdbMapper
 * together correctly, and does it propagate/translate errors the way the
 * rest of the app expects? Response-shape mapping itself (missing fields,
 * status mapping, genre resolution, etc.) is covered exhaustively and much
 * faster in tmdbMapper.test.ts, with no fetch mocking needed there at all.
 */

function jsonResponse(body: unknown, status = 200): Response {
  return { ok: status < 400, status, headers: new Headers(), json: async () => body } as Response
}

function stubFetchByUrl(handlers: Record<string, unknown>): void {
  const fetchMock = vi.fn(async (url: string) => {
    const match = Object.keys(handlers).find((pattern) => url.includes(pattern))
    if (!match) throw new Error(`unexpected url: ${url}`)
    const value = handlers[match]
    return typeof value === 'function' ? (value as () => Response)() : jsonResponse(value)
  })
  vi.stubGlobal('fetch', fetchMock)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('tmdbProvider — movies', () => {
  it('searches movies and normalizes results, resolving genre ids to names', async () => {
    stubFetchByUrl({
      '/genre/movie/list': { genres: [{ id: 28, name: 'Action' }, { id: 12, name: 'Adventure' }] },
      '/genre/tv/list': { genres: [] },
      '/search/movie': {
        results: [
          {
            id: 438631,
            title: 'Dune',
            original_title: 'Dune',
            overview: 'A noble family becomes embroiled in a war.',
            poster_path: '/poster.jpg',
            backdrop_path: '/backdrop.jpg',
            release_date: '2021-10-22',
            genre_ids: [28, 12],
            vote_average: 8
          }
        ]
      }
    })

    const provider = createTmdbProvider({ apiKey: 'test-key' })
    const results = await provider.search('dune', 'movie')

    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({
      externalId: '438631',
      source: 'tmdb',
      mediaType: 'movie',
      title: 'Dune',
      genres: ['Action', 'Adventure'],
      rating: 8
    })
  })

  it('gets movie details, including runtime and external ids appended to the request', async () => {
    let requestedUrl = ''
    const fetchMock = vi.fn(async (url: string) => {
      requestedUrl = url
      return jsonResponse({
        id: 438631,
        title: 'Dune',
        original_title: 'Dune',
        overview: 'A noble family becomes embroiled in a war.',
        poster_path: '/poster.jpg',
        backdrop_path: '/backdrop.jpg',
        release_date: '2021-10-22',
        runtime: 155,
        vote_average: 8,
        status: 'Released',
        genres: [{ id: 878, name: 'Science Fiction' }],
        external_ids: { imdb_id: 'tt1160419' }
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const provider = createTmdbProvider({ apiKey: 'test-key' })
    const result = await provider.getDetails('438631', 'movie')

    expect(requestedUrl).toContain('append_to_response=external_ids')
    expect(result.runtime).toBe(155)
    expect(result.externalIds).toEqual({ imdb: 'tt1160419' })
    expect(result.status).toBe('finished')
  })

  it('reports not_found with a specific message when a movie id does not exist', async () => {
    stubFetchByUrl({ '/movie/999999999': () => jsonResponse({}, 404) })

    const provider = createTmdbProvider({ apiKey: 'test-key' })

    await expect(provider.getDetails('999999999', 'movie')).rejects.toMatchObject({
      code: 'not_found',
      message: 'Movie not found'
    })
  })

  it('surfaces a missing_config error when the API key is rejected', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, 401)))

    const provider = createTmdbProvider({ apiKey: 'invalid-key' })

    await expect(provider.search('dune', 'movie')).rejects.toMatchObject({ code: 'missing_config' })
  })

  it('getSeasons/getEpisodes are no-ops for a movie (no network call at all)', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const provider = createTmdbProvider({ apiKey: 'test-key' })

    expect(await provider.getSeasons('1', 'movie')).toEqual([])
    expect(await provider.getEpisodes('1', 'movie', 1)).toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('tmdbProvider — TV series', () => {
  it('searches TV series using name/first_air_date fields', async () => {
    stubFetchByUrl({
      '/genre/movie/list': { genres: [] },
      '/genre/tv/list': { genres: [{ id: 18, name: 'Drama' }] },
      '/search/tv': {
        results: [
          {
            id: 1399,
            name: 'Game of Thrones',
            original_name: 'Game of Thrones',
            first_air_date: '2011-04-17',
            genre_ids: [18],
            vote_average: 8.4
          }
        ]
      }
    })

    const provider = createTmdbProvider({ apiKey: 'test-key' })
    const [result] = await provider.search('thrones', 'tv')

    expect(result.mediaType).toBe('tv')
    expect(result.releaseDate).toBe('2011-04-17')
    expect(result.genres).toEqual(['Drama'])
  })

  it('gets series details, populating numberOfSeasons/numberOfEpisodes', async () => {
    stubFetchByUrl({
      '/tv/1399': {
        id: 1399,
        name: 'Game of Thrones',
        original_name: 'Game of Thrones',
        first_air_date: '2011-04-17',
        genres: [{ id: 18, name: 'Drama' }],
        vote_average: 8.4,
        status: 'Ended',
        number_of_seasons: 8,
        number_of_episodes: 73
      }
    })

    const provider = createTmdbProvider({ apiKey: 'test-key' })
    const result = await provider.getDetails('1399', 'tv')

    expect(result.numberOfSeasons).toBe(8)
    expect(result.numberOfEpisodes).toBe(73)
    expect(result.status).toBe('finished')
  })

  it('reports not_found with a specific message when a series id does not exist', async () => {
    stubFetchByUrl({ '/tv/999999999': () => jsonResponse({}, 404) })

    const provider = createTmdbProvider({ apiKey: 'test-key' })

    await expect(provider.getDetails('999999999', 'tv')).rejects.toMatchObject({
      code: 'not_found',
      message: 'Series not found'
    })
  })

  it('gets seasons for a series, sorted by season number', async () => {
    stubFetchByUrl({
      '/tv/1399': {
        id: 1399,
        name: 'Game of Thrones',
        seasons: [
          { season_number: 1, name: 'Season 1', overview: 'ov1', poster_path: '/s1.jpg', air_date: '2011-04-17', episode_count: 10 },
          { season_number: 0, name: 'Specials', overview: null, poster_path: null, air_date: null, episode_count: 2 }
        ]
      }
    })

    const provider = createTmdbProvider({ apiKey: 'test-key' })
    const seasons = await provider.getSeasons('1399', 'tv')

    expect(seasons.map((s) => s.seasonNumber)).toEqual([0, 1])
  })

  it('reports not_found naming the season when a season does not exist', async () => {
    stubFetchByUrl({ '/tv/1399/season/99': () => jsonResponse({}, 404) })

    const provider = createTmdbProvider({ apiKey: 'test-key' })

    await expect(provider.getEpisodes('1399', 'tv', 99)).rejects.toMatchObject({
      code: 'not_found',
      message: 'Season 99 not found'
    })
  })

  it('gets episodes for a season', async () => {
    stubFetchByUrl({
      '/tv/1399/season/1': {
        episodes: [{ episode_number: 1, name: 'Winter Is Coming', overview: 'The pilot.', air_date: '2011-04-17', runtime: 62 }]
      }
    })

    const provider = createTmdbProvider({ apiKey: 'test-key' })
    const episodes = await provider.getEpisodes('1399', 'tv', 1)

    expect(episodes).toEqual([
      { episodeNumber: 1, title: 'Winter Is Coming', overview: 'The pilot.', airDate: '2011-04-17', runtimeMinutes: 62 }
    ])
  })
})

describe('tmdbProvider — unsupported media type', () => {
  it('search returns an empty array for anime instead of calling the API', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const provider = createTmdbProvider({ apiKey: 'test-key' })
    const results = await provider.search('naruto', 'anime')

    expect(results).toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('getDetails throws for anime instead of calling the API', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const provider = createTmdbProvider({ apiKey: 'test-key' })

    await expect(provider.getDetails('1', 'anime')).rejects.toThrow(/does not support/)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
