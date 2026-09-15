import { describe, expect, it } from 'vitest'
import { buildDashboardShelves } from './dashboardShelves'
import type { LibraryEntryDTO, LibraryItemDTO, MediaItemDTO } from './library'

let nextId = 1

function makeMediaItem(overrides: Partial<MediaItemDTO> = {}): MediaItemDTO {
  return {
    id: nextId++,
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
    id: nextId++,
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

function makeItem(
  overrides: { media?: Partial<MediaItemDTO>; entry?: Partial<LibraryEntryDTO>; lastWatchedAt?: string | null } = {}
): LibraryItemDTO {
  return {
    mediaItem: makeMediaItem(overrides.media),
    libraryEntry: makeLibraryEntry(overrides.entry),
    progress: null,
    lastWatchedAt: overrides.lastWatchedAt ?? null
  }
}

describe('buildDashboardShelves', () => {
  it('returns every shelf empty for an empty library', () => {
    const shelves = buildDashboardShelves([], 10)

    expect(shelves).toEqual({
      continueWatching: [],
      recentlyWatched: [],
      recentlyAdded: [],
      favorites: [],
      highestRated: [],
      watchlist: []
    })
  })

  it('puts only "watching" items in Continue Watching', () => {
    const items = [
      makeItem({ media: { title: 'Watching' }, entry: { watchStatus: 'watching' } }),
      makeItem({ media: { title: 'Completed' }, entry: { watchStatus: 'completed' } }),
      makeItem({ media: { title: 'PlanToWatch' }, entry: { watchStatus: 'plan_to_watch' } })
    ]

    const shelves = buildDashboardShelves(items, 10)

    expect(shelves.continueWatching.map((i) => i.mediaItem.title)).toEqual(['Watching'])
  })

  it('sorts Continue Watching by most recently watched', () => {
    const items = [
      makeItem({ media: { title: 'Older' }, entry: { watchStatus: 'watching' }, lastWatchedAt: '2024-01-01T00:00:00.000Z' }),
      makeItem({ media: { title: 'Newer' }, entry: { watchStatus: 'watching' }, lastWatchedAt: '2024-06-01T00:00:00.000Z' })
    ]

    const shelves = buildDashboardShelves(items, 10)

    expect(shelves.continueWatching.map((i) => i.mediaItem.title)).toEqual(['Newer', 'Older'])
  })

  it('only includes items with a lastWatchedAt in Recently Watched', () => {
    const items = [
      makeItem({ media: { title: 'Watched' }, lastWatchedAt: '2024-01-01T00:00:00.000Z' }),
      makeItem({ media: { title: 'Never watched' }, lastWatchedAt: null })
    ]

    const shelves = buildDashboardShelves(items, 10)

    expect(shelves.recentlyWatched.map((i) => i.mediaItem.title)).toEqual(['Watched'])
  })

  it('includes every item in Recently Added, sorted by addedAt', () => {
    const items = [
      makeItem({ media: { title: 'First' }, entry: { addedAt: '2024-01-01T00:00:00.000Z' } }),
      makeItem({ media: { title: 'Second' }, entry: { addedAt: '2024-06-01T00:00:00.000Z' } })
    ]

    const shelves = buildDashboardShelves(items, 10)

    expect(shelves.recentlyAdded.map((i) => i.mediaItem.title)).toEqual(['Second', 'First'])
  })

  it('only includes favorited items in Favorites', () => {
    const items = [
      makeItem({ media: { title: 'Fav' }, entry: { favorite: true } }),
      makeItem({ media: { title: 'Not fav' }, entry: { favorite: false } })
    ]

    const shelves = buildDashboardShelves(items, 10)

    expect(shelves.favorites.map((i) => i.mediaItem.title)).toEqual(['Fav'])
  })

  it('only includes rated items in Highest Rated, sorted highest first', () => {
    const items = [
      makeItem({ media: { title: 'Unrated' }, entry: { rating: null } }),
      makeItem({ media: { title: 'Low' }, entry: { rating: 6 } }),
      makeItem({ media: { title: 'High' }, entry: { rating: 9.5 } })
    ]

    const shelves = buildDashboardShelves(items, 10)

    expect(shelves.highestRated.map((i) => i.mediaItem.title)).toEqual(['High', 'Low'])
  })

  it('only includes plan_to_watch items in Watchlist', () => {
    const items = [
      makeItem({ media: { title: 'Queued' }, entry: { watchStatus: 'plan_to_watch' } }),
      makeItem({ media: { title: 'Watching' }, entry: { watchStatus: 'watching' } })
    ]

    const shelves = buildDashboardShelves(items, 10)

    expect(shelves.watchlist.map((i) => i.mediaItem.title)).toEqual(['Queued'])
  })

  it('caps every shelf at the given limit', () => {
    const items = Array.from({ length: 20 }, (_, i) =>
      makeItem({ media: { title: `Item ${i}` }, entry: { favorite: true } })
    )

    const shelves = buildDashboardShelves(items, 5)

    expect(shelves.favorites).toHaveLength(5)
    expect(shelves.recentlyAdded).toHaveLength(5)
  })
})
