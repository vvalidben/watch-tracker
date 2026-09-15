import { afterEach, describe, expect, it, vi } from 'vitest'
import { createAniListProvider } from './anilistProvider'

function jsonResponse(body: unknown, status = 200): Response {
  return { ok: status < 400, status, headers: new Headers(), json: async () => body } as Response
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('anilistProvider', () => {
  it('normalizes a search result, preferring the English title and scaling rating to /10', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        data: {
          Page: {
            media: [
              {
                id: 154587,
                title: { romaji: 'Sousou no Frieren', english: 'Frieren: Beyond Journey’s End' },
                description: 'Frieren the elf mage...',
                coverImage: { large: 'https://cdn.test/frieren.jpg' },
                bannerImage: 'https://cdn.test/frieren-banner.jpg',
                startDate: { year: 2023, month: 9, day: 29 },
                genres: ['Adventure', 'Drama'],
                averageScore: 92,
                episodes: 28
              }
            ]
          }
        }
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    const provider = createAniListProvider()
    const [result] = await provider.search('frieren', 'anime')

    expect(result).toEqual({
      externalId: '154587',
      source: 'anilist',
      mediaType: 'anime',
      title: 'Frieren: Beyond Journey’s End',
      originalTitle: 'Sousou no Frieren',
      poster: 'https://cdn.test/frieren.jpg',
      backdrop: 'https://cdn.test/frieren-banner.jpg',
      description: 'Frieren the elf mage...',
      releaseDate: '2023-09-29',
      status: null,
      genres: ['Adventure', 'Drama'],
      rating: 9.2,
      numberOfSeasons: null,
      numberOfEpisodes: 28
    })
  })

  it('falls back to the romaji title when no English title exists', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        data: {
          Page: {
            media: [
              {
                id: 1,
                title: { romaji: 'Some Anime', english: null },
                description: null,
                coverImage: null,
                bannerImage: null,
                startDate: { year: null, month: null, day: null },
                genres: [],
                averageScore: null,
                episodes: null
              }
            ]
          }
        }
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    const provider = createAniListProvider()
    const [result] = await provider.search('some anime', 'anime')

    expect(result.title).toBe('Some Anime')
    expect(result.originalTitle).toBeNull()
    expect(result.poster).toBeNull()
    expect(result.releaseDate).toBeNull()
    expect(result.rating).toBeNull()
    expect(result.numberOfEpisodes).toBeNull()
  })

  it('converts leftover <br> tags in the description to newlines and strips other tags', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        data: {
          Page: {
            media: [
              {
                id: 3,
                title: { romaji: 'Tagged Description', english: null },
                description: 'Plain synopsis text.<br><br>(Source: <i>Crunchyroll</i>)',
                coverImage: null,
                bannerImage: null,
                startDate: { year: null, month: null, day: null },
                genres: [],
                averageScore: null,
                episodes: null
              }
            ]
          }
        }
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    const provider = createAniListProvider()
    const [result] = await provider.search('tagged', 'anime')

    expect(result.description).toBe('Plain synopsis text.\n\n(Source: Crunchyroll)')
  })

  it('pads a partial start date (year only) to a full ISO date', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        data: {
          Page: {
            media: [
              {
                id: 2,
                title: { romaji: 'Ongoing Show', english: null },
                description: null,
                coverImage: null,
                bannerImage: null,
                startDate: { year: 2024, month: null, day: null },
                genres: [],
                averageScore: null,
                episodes: null
              }
            ]
          }
        }
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    const provider = createAniListProvider()
    const [result] = await provider.search('ongoing', 'anime')

    expect(result.releaseDate).toBe('2024-01-01')
  })

  it('returns an empty array for an unsupported media type instead of calling the API', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const provider = createAniListProvider()
    const results = await provider.search('dune', 'movie')

    expect(results).toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('throws when AniList responds with GraphQL errors and no data', async () => {
    // AniList can return HTTP 200 with a null `data` and populated `errors`.
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ data: null, errors: [{ message: 'Invalid search query.' }] }, 200)
    )
    vi.stubGlobal('fetch', fetchMock)

    const provider = createAniListProvider()

    await expect(provider.search('???', 'anime')).rejects.toThrow('Invalid search query.')
  })

  it('getDetails throws a clear error when the id does not exist', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: { Media: null } }))
    vi.stubGlobal('fetch', fetchMock)

    const provider = createAniListProvider()

    await expect(provider.getDetails('999999', 'anime')).rejects.toThrow(/no anilist entry/i)
  })

  it.each([
    ['RELEASING', 'airing'],
    ['HIATUS', 'airing'],
    ['FINISHED', 'finished'],
    ['NOT_YET_RELEASED', 'upcoming'],
    ['CANCELLED', 'cancelled'],
    ['SOMETHING_ELSE', null]
  ])('maps AniList status "%s" to "%s"', async (aniListStatus, expected) => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        data: {
          Media: {
            id: 1,
            title: { romaji: 'X', english: null },
            description: null,
            coverImage: null,
            bannerImage: null,
            startDate: { year: null, month: null, day: null },
            status: aniListStatus,
            genres: [],
            averageScore: null,
            episodes: null
          }
        }
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    const provider = createAniListProvider()
    const result = await provider.getDetails('1', 'anime')

    expect(result.status).toBe(expected)
  })

  it('getSeasons returns a single implicit season carrying the episode count', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        data: {
          Media: {
            id: 154587,
            title: { romaji: 'Sousou no Frieren', english: null },
            description: null,
            coverImage: null,
            bannerImage: null,
            startDate: { year: null, month: null, day: null },
            status: null,
            genres: [],
            averageScore: null,
            episodes: 28
          }
        }
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    const provider = createAniListProvider()
    const seasons = await provider.getSeasons('154587', 'anime')

    expect(seasons).toEqual([
      { seasonNumber: 1, title: null, overview: null, poster: null, airDate: null, episodeCount: 28 }
    ])
  })

  it('getSeasons returns an empty array for a non-anime type', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const provider = createAniListProvider()
    const seasons = await provider.getSeasons('1', 'movie')

    expect(seasons).toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('getEpisodes parses "Episode N - Title" from streamingEpisodes when available', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        data: {
          Media: {
            episodes: 2,
            streamingEpisodes: [
              { title: 'Episode 1 - Journey’s End', thumbnail: null },
              { title: 'Episode 2 - On the Move', thumbnail: null }
            ]
          }
        }
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    const provider = createAniListProvider()
    const episodes = await provider.getEpisodes('154587', 'anime', 1)

    expect(episodes).toEqual([
      { episodeNumber: 1, title: 'Journey’s End', overview: null, airDate: null, runtimeMinutes: null },
      { episodeNumber: 2, title: 'On the Move', overview: null, airDate: null, runtimeMinutes: null }
    ])
  })

  it('getEpisodes falls back to bare numbered episodes when no streamingEpisodes exist', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ data: { Media: { episodes: 3, streamingEpisodes: [] } } })
    )
    vi.stubGlobal('fetch', fetchMock)

    const provider = createAniListProvider()
    const episodes = await provider.getEpisodes('1', 'anime', 1)

    expect(episodes).toEqual([
      { episodeNumber: 1, title: null, overview: null, airDate: null, runtimeMinutes: null },
      { episodeNumber: 2, title: null, overview: null, airDate: null, runtimeMinutes: null },
      { episodeNumber: 3, title: null, overview: null, airDate: null, runtimeMinutes: null }
    ])
  })

  it('getEpisodes returns an empty array for any season other than 1', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const provider = createAniListProvider()
    const episodes = await provider.getEpisodes('1', 'anime', 2)

    expect(episodes).toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
