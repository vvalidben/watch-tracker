import { describe, expect, it } from 'vitest'
import {
  backdropUrl,
  mapMovieStatus,
  mapTvStatus,
  normalizeEpisode,
  normalizeExternalIds,
  normalizeMovie,
  normalizeSeason,
  normalizeTv,
  posterUrl,
  resolveGenreNames
} from './tmdbMapper'

const IMAGE_BASE = 'https://image.tmdb.org/t/p'

describe('posterUrl / backdropUrl', () => {
  it('builds a full poster URL from a TMDB path', () => {
    expect(posterUrl('/abc.jpg', IMAGE_BASE)).toBe('https://image.tmdb.org/t/p/w500/abc.jpg')
  })

  it('builds a full backdrop URL from a TMDB path', () => {
    expect(backdropUrl('/abc.jpg', IMAGE_BASE)).toBe('https://image.tmdb.org/t/p/w1280/abc.jpg')
  })

  it('returns null for a null or missing path rather than a broken URL', () => {
    expect(posterUrl(null, IMAGE_BASE)).toBeNull()
    expect(posterUrl(undefined, IMAGE_BASE)).toBeNull()
    expect(backdropUrl(null, IMAGE_BASE)).toBeNull()
  })
})

describe('mapMovieStatus', () => {
  it.each([
    ['Released', 'finished'],
    ['Canceled', 'cancelled'],
    ['Rumored', 'upcoming'],
    ['Planned', 'upcoming'],
    ['In Production', 'upcoming'],
    ['Post Production', 'upcoming'],
    [undefined, null],
    ['SomethingTmdbAddsLater', null]
  ])('maps "%s" to "%s"', (input, expected) => {
    expect(mapMovieStatus(input)).toBe(expected)
  })
})

describe('mapTvStatus', () => {
  it.each([
    ['Returning Series', 'airing'],
    ['Ended', 'finished'],
    ['Canceled', 'cancelled'],
    ['Planned', 'upcoming'],
    ['In Production', 'upcoming'],
    ['Pilot', 'upcoming'],
    [undefined, null],
    ['SomethingTmdbAddsLater', null]
  ])('maps "%s" to "%s"', (input, expected) => {
    expect(mapTvStatus(input)).toBe(expected)
  })
})

describe('resolveGenreNames', () => {
  it('prefers full genre objects (from a details response) over ids', () => {
    const names = resolveGenreNames({ genres: [{ id: 1, name: 'Action' }] }, new Map([[1, 'Wrong']]))
    expect(names).toEqual(['Action'])
  })

  it('resolves genre ids to names via the provided map (from a search response)', () => {
    const names = resolveGenreNames({ genre_ids: [28, 12] }, new Map([[28, 'Action'], [12, 'Adventure']]))
    expect(names).toEqual(['Action', 'Adventure'])
  })

  it('silently drops an id with no matching name rather than producing a gap', () => {
    const names = resolveGenreNames({ genre_ids: [28, 999] }, new Map([[28, 'Action']]))
    expect(names).toEqual(['Action'])
  })

  it('returns an empty array when neither genres nor genre_ids is present', () => {
    expect(resolveGenreNames({}, new Map())).toEqual([])
  })
})

describe('normalizeExternalIds', () => {
  it('returns undefined when no external ids block is present', () => {
    expect(normalizeExternalIds(undefined)).toBeUndefined()
  })

  it('maps imdb_id and tvdb_id to a plain record', () => {
    expect(normalizeExternalIds({ imdb_id: 'tt0000001', tvdb_id: 12345 })).toEqual({ imdb: 'tt0000001', tvdb: '12345' })
  })

  it('omits keys that are absent or null rather than including empty values', () => {
    expect(normalizeExternalIds({ imdb_id: null })).toBeUndefined()
    expect(normalizeExternalIds({ imdb_id: 'tt1', tvdb_id: null })).toEqual({ imdb: 'tt1' })
  })
})

describe('normalizeMovie', () => {
  it('maps every field of a well-formed movie response', () => {
    const result = normalizeMovie(
      {
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
        external_ids: { imdb_id: 'tt1160419' }
      },
      ['Action', 'Adventure'],
      IMAGE_BASE
    )

    expect(result).toEqual({
      externalId: '438631',
      source: 'tmdb',
      mediaType: 'movie',
      title: 'Dune',
      originalTitle: null,
      poster: 'https://image.tmdb.org/t/p/w500/poster.jpg',
      backdrop: 'https://image.tmdb.org/t/p/w1280/backdrop.jpg',
      description: 'A noble family becomes embroiled in a war.',
      releaseDate: '2021-10-22',
      status: 'finished',
      genres: ['Action', 'Adventure'],
      rating: 8,
      numberOfSeasons: null,
      numberOfEpisodes: null,
      runtime: 155,
      externalIds: { imdb: 'tt1160419' }
    })
  })

  it('keeps originalTitle only when it differs from the display title', () => {
    const result = normalizeMovie(
      { id: 129, title: 'Spirited Away', original_title: '千と千尋の神隠し' },
      [],
      IMAGE_BASE
    )
    expect(result.originalTitle).toBe('千と千尋の神隠し')

    const same = normalizeMovie({ id: 129, title: 'Dune', original_title: 'Dune' }, [], IMAGE_BASE)
    expect(same.originalTitle).toBeNull()
  })

  it('falls back to safe defaults for every optional/missing field (a malformed or minimal response)', () => {
    const result = normalizeMovie({}, [], IMAGE_BASE)

    expect(result).toEqual({
      externalId: '',
      source: 'tmdb',
      mediaType: 'movie',
      title: 'Untitled',
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
      runtime: null,
      externalIds: undefined
    })
  })

  it('treats a non-numeric vote_average as no rating rather than throwing', () => {
    const result = normalizeMovie({ id: 1, title: 'X', vote_average: null }, [], IMAGE_BASE)
    expect(result.rating).toBeNull()
  })
})

describe('normalizeTv', () => {
  it('maps every field of a well-formed TV details response', () => {
    const result = normalizeTv(
      {
        id: 1399,
        name: 'Game of Thrones',
        original_name: 'Game of Thrones',
        overview: 'Seven noble families fight for control.',
        poster_path: '/got.jpg',
        backdrop_path: '/got-backdrop.jpg',
        first_air_date: '2011-04-17',
        vote_average: 8.4,
        status: 'Ended',
        number_of_seasons: 8,
        number_of_episodes: 73,
        external_ids: { imdb_id: 'tt0944947' }
      },
      ['Drama'],
      IMAGE_BASE
    )

    expect(result).toEqual({
      externalId: '1399',
      source: 'tmdb',
      mediaType: 'tv',
      title: 'Game of Thrones',
      originalTitle: null,
      poster: 'https://image.tmdb.org/t/p/w500/got.jpg',
      backdrop: 'https://image.tmdb.org/t/p/w1280/got-backdrop.jpg',
      description: 'Seven noble families fight for control.',
      releaseDate: '2011-04-17',
      status: 'finished',
      genres: ['Drama'],
      rating: 8.4,
      numberOfSeasons: 8,
      numberOfEpisodes: 73,
      externalIds: { imdb: 'tt0944947' }
    })
  })

  it('leaves numberOfSeasons/numberOfEpisodes null for a search result (TMDB omits them there)', () => {
    const result = normalizeTv({ id: 1399, name: 'Game of Thrones' }, [], IMAGE_BASE)
    expect(result.numberOfSeasons).toBeNull()
    expect(result.numberOfEpisodes).toBeNull()
  })

  it('falls back to safe defaults for a minimal/malformed response', () => {
    const result = normalizeTv({}, [], IMAGE_BASE)
    expect(result.title).toBe('Untitled')
    expect(result.externalId).toBe('')
    expect(result.genres).toEqual([])
  })
})

describe('normalizeSeason', () => {
  it('maps a well-formed season summary', () => {
    const result = normalizeSeason(
      { season_number: 1, name: 'Season 1', overview: 'ov1', poster_path: '/s1.jpg', air_date: '2011-04-17', episode_count: 10 },
      IMAGE_BASE
    )

    expect(result).toEqual({
      seasonNumber: 1,
      title: 'Season 1',
      overview: 'ov1',
      poster: 'https://image.tmdb.org/t/p/w500/s1.jpg',
      airDate: '2011-04-17',
      episodeCount: 10
    })
  })

  it('falls back to safe defaults for missing fields', () => {
    const result = normalizeSeason({}, IMAGE_BASE)
    expect(result).toEqual({
      seasonNumber: 0,
      title: null,
      overview: null,
      poster: null,
      airDate: null,
      episodeCount: null
    })
  })
})

describe('normalizeEpisode', () => {
  it('maps a well-formed episode', () => {
    const result = normalizeEpisode({
      episode_number: 1,
      name: 'Winter Is Coming',
      overview: 'The pilot.',
      air_date: '2011-04-17',
      runtime: 62
    })

    expect(result).toEqual({
      episodeNumber: 1,
      title: 'Winter Is Coming',
      overview: 'The pilot.',
      airDate: '2011-04-17',
      runtimeMinutes: 62
    })
  })

  it('falls back to safe defaults for missing fields', () => {
    const result = normalizeEpisode({})
    expect(result).toEqual({
      episodeNumber: 0,
      title: null,
      overview: null,
      airDate: null,
      runtimeMinutes: null
    })
  })
})
