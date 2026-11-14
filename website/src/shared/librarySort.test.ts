import { describe, expect, it } from 'vitest'
import { sortLibraryItems } from './librarySort'
import type { LibraryEntryDTO, LibraryItemDTO, MediaItemDTO } from './library'

function makeMediaItem(overrides: Partial<MediaItemDTO> = {}): MediaItemDTO {
  return {
    id: 1,
    type: 'movie',
    title: 'Untitled',
    originalTitle: null,
    overview: null,
    posterPath: null,
    backdropPath: null,
    releaseDate: null,
    airingStatus: null,
    numberOfSeasons: null,
    numberOfEpisodes: null,
    runtimeMinutes: null,
    genres: [],
    source: 'manual',
    sourceId: null,
    ...overrides
  }
}

function makeLibraryEntry(overrides: Partial<LibraryEntryDTO> = {}): LibraryEntryDTO {
  return {
    id: 1,
    mediaItemId: 1,
    watchStatus: 'plan_to_watch',
    rating: null,
    favorite: false,
    notes: null,
    rewatchCount: 0,
    addedAt: '2024-01-01T00:00:00.000Z',
    startedAt: null,
    completedAt: null,
    ...overrides
  }
}

function makeItem(overrides: {
  media?: Partial<MediaItemDTO>
  entry?: Partial<LibraryEntryDTO>
  lastWatchedAt?: string | null
} = {}): LibraryItemDTO {
  return {
    mediaItem: makeMediaItem(overrides.media),
    libraryEntry: makeLibraryEntry(overrides.entry),
    progress: null,
    lastWatchedAt: overrides.lastWatchedAt ?? null
  }
}

describe('sortLibraryItems', () => {
  it('does not mutate the input array', () => {
    const items = [makeItem({ media: { title: 'B' } }), makeItem({ media: { title: 'A' } })]
    const original = [...items]

    sortLibraryItems(items, 'alphabetical')

    expect(items).toEqual(original)
  })

  it('sorts alphabetically by title, case-sensitively-insensitive via localeCompare', () => {
    const items = [
      makeItem({ media: { title: 'Zebra' } }),
      makeItem({ media: { title: 'apple' } }),
      makeItem({ media: { title: 'Banana' } })
    ]

    const sorted = sortLibraryItems(items, 'alphabetical')

    expect(sorted.map((i) => i.mediaItem.title)).toEqual(['apple', 'Banana', 'Zebra'])
  })

  it('sorts by recently added, newest first', () => {
    const items = [
      makeItem({ entry: { addedAt: '2024-01-01T00:00:00.000Z' } }),
      makeItem({ entry: { addedAt: '2024-06-01T00:00:00.000Z' } }),
      makeItem({ entry: { addedAt: '2024-03-01T00:00:00.000Z' } })
    ]

    const sorted = sortLibraryItems(items, 'recently_added')

    expect(sorted.map((i) => i.libraryEntry.addedAt)).toEqual([
      '2024-06-01T00:00:00.000Z',
      '2024-03-01T00:00:00.000Z',
      '2024-01-01T00:00:00.000Z'
    ])
  })

  it('sorts by recently watched, newest first, with never-watched items last', () => {
    const items = [
      makeItem({ media: { title: 'Never watched' }, lastWatchedAt: null }),
      makeItem({ media: { title: 'Watched yesterday' }, lastWatchedAt: '2024-06-01T00:00:00.000Z' }),
      makeItem({ media: { title: 'Watched today' }, lastWatchedAt: '2024-06-02T00:00:00.000Z' })
    ]

    const sorted = sortLibraryItems(items, 'recently_watched')

    expect(sorted.map((i) => i.mediaItem.title)).toEqual(['Watched today', 'Watched yesterday', 'Never watched'])
  })

  it('sorts by highest rating first, with unrated items last', () => {
    const items = [
      makeItem({ media: { title: 'Unrated' }, entry: { rating: null } }),
      makeItem({ media: { title: 'Low' }, entry: { rating: 6 } }),
      makeItem({ media: { title: 'High' }, entry: { rating: 9.5 } })
    ]

    const sorted = sortLibraryItems(items, 'rating_desc')

    expect(sorted.map((i) => i.mediaItem.title)).toEqual(['High', 'Low', 'Unrated'])
  })

  it('sorts by lowest rating first, with unrated items STILL last (not first)', () => {
    const items = [
      makeItem({ media: { title: 'Unrated' }, entry: { rating: null } }),
      makeItem({ media: { title: 'Low' }, entry: { rating: 6 } }),
      makeItem({ media: { title: 'High' }, entry: { rating: 9.5 } })
    ]

    const sorted = sortLibraryItems(items, 'rating_asc')

    expect(sorted.map((i) => i.mediaItem.title)).toEqual(['Low', 'High', 'Unrated'])
  })

  it('sorts by release date, newest first, with unknown dates last', () => {
    const items = [
      makeItem({ media: { title: 'Unknown date', releaseDate: null } }),
      makeItem({ media: { title: 'Old', releaseDate: '1990-01-01' } }),
      makeItem({ media: { title: 'New', releaseDate: '2024-01-01' } })
    ]

    const sorted = sortLibraryItems(items, 'release_date')

    expect(sorted.map((i) => i.mediaItem.title)).toEqual(['New', 'Old', 'Unknown date'])
  })

  it('treats a full tie stably (order among equal keys is preserved)', () => {
    const items = [
      makeItem({ media: { title: 'First' }, entry: { rating: 8 } }),
      makeItem({ media: { title: 'Second' }, entry: { rating: 8 } })
    ]

    const sorted = sortLibraryItems(items, 'rating_desc')

    expect(sorted.map((i) => i.mediaItem.title)).toEqual(['First', 'Second'])
  })
})
