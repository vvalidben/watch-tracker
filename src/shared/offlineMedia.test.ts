import { describe, expect, it } from 'vitest'
import { mediaItemToOfflineNormalizedMedia } from './offlineMedia'
import type { MediaItemDTO } from './library'

function makeMediaItem(overrides: Partial<MediaItemDTO> = {}): MediaItemDTO {
  return {
    id: 1,
    type: 'movie',
    title: 'Dune',
    originalTitle: null,
    overview: 'A noble family becomes embroiled in a war.',
    posterPath: 'https://image.tmdb.org/t/p/w500/poster.jpg',
    backdropPath: 'https://image.tmdb.org/t/p/w1280/backdrop.jpg',
    releaseDate: '2021-10-22',
    airingStatus: 'finished',
    numberOfSeasons: null,
    numberOfEpisodes: null,
    runtimeMinutes: 155,
    genres: ['Science Fiction'],
    source: 'tmdb',
    sourceId: '438631',
    ...overrides
  }
}

describe('mediaItemToOfflineNormalizedMedia', () => {
  it('maps every cached field onto the normalized shape the detail page expects', () => {
    const result = mediaItemToOfflineNormalizedMedia(makeMediaItem())

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
      genres: ['Science Fiction'],
      rating: null,
      numberOfSeasons: null,
      numberOfEpisodes: null,
      runtime: 155
    })
  })

  it('always reports rating as null — the external score is never cached locally', () => {
    const result = mediaItemToOfflineNormalizedMedia(makeMediaItem())
    expect(result?.rating).toBeNull()
  })

  it('omits runtime rather than reporting 0 when nothing was cached', () => {
    const result = mediaItemToOfflineNormalizedMedia(makeMediaItem({ runtimeMinutes: null }))
    expect(result?.runtime).toBeUndefined()
  })

  it('returns null for a manual entry, which has no external id to route further requests to', () => {
    const result = mediaItemToOfflineNormalizedMedia(makeMediaItem({ source: 'manual', sourceId: null }))
    expect(result).toBeNull()
  })

  it('returns null if sourceId is somehow missing even for a real provider', () => {
    const result = mediaItemToOfflineNormalizedMedia(makeMediaItem({ source: 'tmdb', sourceId: null }))
    expect(result).toBeNull()
  })

  it('carries a TV series’ season/episode counts through unchanged', () => {
    const result = mediaItemToOfflineNormalizedMedia(
      makeMediaItem({ type: 'tv', numberOfSeasons: 8, numberOfEpisodes: 73, runtimeMinutes: null })
    )
    expect(result?.numberOfSeasons).toBe(8)
    expect(result?.numberOfEpisodes).toBe(73)
  })
})
