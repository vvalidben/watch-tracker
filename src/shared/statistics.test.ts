import { describe, expect, it } from 'vitest'
import {
  bucketByMonth,
  computeCompletion,
  computeFavoriteGenres,
  computeStatistics,
  rankRatedItems
} from './statistics'
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

function makeItem(overrides: { media?: Partial<MediaItemDTO>; entry?: Partial<LibraryEntryDTO> } = {}): LibraryItemDTO {
  return {
    mediaItem: makeMediaItem(overrides.media),
    libraryEntry: makeLibraryEntry(overrides.entry),
    progress: null,
    lastWatchedAt: null
  }
}

describe('rankRatedItems', () => {
  it('returns empty lists when nothing is rated', () => {
    const items = [makeItem(), makeItem()]

    const { highest, lowest } = rankRatedItems(items, 5)

    expect(highest).toEqual([])
    expect(lowest).toEqual([])
  })

  it('excludes unrated items and sorts rated ones highest/lowest first', () => {
    const items = [
      makeItem({ media: { title: 'Unrated' }, entry: { rating: null } }),
      makeItem({ media: { title: 'Mid' }, entry: { rating: 6 } }),
      makeItem({ media: { title: 'High' }, entry: { rating: 9.5 } }),
      makeItem({ media: { title: 'Low' }, entry: { rating: 2 } })
    ]

    const { highest, lowest } = rankRatedItems(items, 5)

    expect(highest.map((i) => i.title)).toEqual(['High', 'Mid', 'Low'])
    expect(lowest.map((i) => i.title)).toEqual(['Low', 'Mid', 'High'])
  })

  it('breaks rating ties alphabetically by title', () => {
    const items = [
      makeItem({ media: { title: 'Zebra' }, entry: { rating: 8 } }),
      makeItem({ media: { title: 'Apple' }, entry: { rating: 8 } })
    ]

    const { highest } = rankRatedItems(items, 5)

    expect(highest.map((i) => i.title)).toEqual(['Apple', 'Zebra'])
  })

  it('caps results at the given limit', () => {
    const items = Array.from({ length: 10 }, (_, i) => makeItem({ media: { title: `Item ${i}` }, entry: { rating: i } }))

    const { highest, lowest } = rankRatedItems(items, 3)

    expect(highest).toHaveLength(3)
    expect(lowest).toHaveLength(3)
  })
})

describe('computeCompletion', () => {
  it('counts every status, defaulting to zero for statuses with nothing in them', () => {
    const items = [makeItem({ entry: { watchStatus: 'completed' } })]

    const completion = computeCompletion(items)

    expect(completion.byStatus).toEqual([
      { status: 'plan_to_watch', count: 0 },
      { status: 'watching', count: 0 },
      { status: 'completed', count: 1 },
      { status: 'on_hold', count: 0 },
      { status: 'dropped', count: 0 }
    ])
    expect(completion.totalInLibrary).toBe(1)
  })

  it('returns a null completion rate when nothing has been started', () => {
    const items = [makeItem({ entry: { watchStatus: 'plan_to_watch' } })]

    expect(computeCompletion(items).completionRate).toBeNull()
  })

  it('computes completion rate as completed / started, excluding plan_to_watch', () => {
    const items = [
      makeItem({ entry: { watchStatus: 'completed' } }),
      makeItem({ entry: { watchStatus: 'completed' } }),
      makeItem({ entry: { watchStatus: 'watching' } }),
      makeItem({ entry: { watchStatus: 'plan_to_watch' } }) // not "started", excluded from denominator
    ]

    // 2 completed / 3 started (completed+completed+watching) = 67%
    expect(computeCompletion(items).completionRate).toBe(67)
  })
})

describe('computeFavoriteGenres', () => {
  it('only counts genres of items being watched or completed, not the backlog', () => {
    const items = [
      makeItem({ media: { genres: ['Action'] }, entry: { watchStatus: 'plan_to_watch' } }),
      makeItem({ media: { genres: ['Drama'] }, entry: { watchStatus: 'watching' } }),
      makeItem({ media: { genres: ['Drama', 'Comedy'] }, entry: { watchStatus: 'completed' } })
    ]

    const genres = computeFavoriteGenres(items, 10)

    expect(genres).toEqual([
      { genre: 'Drama', count: 2 },
      { genre: 'Comedy', count: 1 }
    ])
  })

  it('caps results at the given limit', () => {
    const items = Array.from({ length: 5 }, (_, i) =>
      makeItem({ media: { genres: [`Genre ${i}`] }, entry: { watchStatus: 'completed' } })
    )

    expect(computeFavoriteGenres(items, 2)).toHaveLength(2)
  })

  it('returns an empty list when nothing has been watched', () => {
    const items = [makeItem({ media: { genres: ['Action'] }, entry: { watchStatus: 'plan_to_watch' } })]

    expect(computeFavoriteGenres(items, 10)).toEqual([])
  })
})

describe('bucketByMonth', () => {
  it('zero-fills every month in the window when there are no events', () => {
    const referenceDate = new Date(2026, 2, 15) // March 2026

    const months = bucketByMonth([], 3, referenceDate)

    expect(months).toEqual([
      { month: '2026-01', count: 0 },
      { month: '2026-02', count: 0 },
      { month: '2026-03', count: 0 }
    ])
  })

  it('counts events into their month, ending at the reference month', () => {
    const referenceDate = new Date(2026, 2, 15) // March 2026
    const dates = ['2026-01-10T00:00:00.000Z', '2026-01-20T00:00:00.000Z', '2026-03-01T00:00:00.000Z']

    const months = bucketByMonth(dates, 3, referenceDate)

    expect(months).toEqual([
      { month: '2026-01', count: 2 },
      { month: '2026-02', count: 0 },
      { month: '2026-03', count: 1 }
    ])
  })

  it('ignores events outside the window', () => {
    const referenceDate = new Date(2026, 2, 15) // March 2026
    const dates = ['2025-01-01T00:00:00.000Z'] // more than 3 months back

    const months = bucketByMonth(dates, 3, referenceDate)

    expect(months.reduce((sum, m) => sum + m.count, 0)).toBe(0)
  })

  it('spans a year boundary correctly', () => {
    const referenceDate = new Date(2026, 1, 1) // Feb 2026
    const dates = ['2025-12-15T00:00:00.000Z']

    const months = bucketByMonth(dates, 3, referenceDate)

    expect(months).toEqual([
      { month: '2025-12', count: 1 },
      { month: '2026-01', count: 0 },
      { month: '2026-02', count: 0 }
    ])
  })
})

describe('computeStatistics', () => {
  it('combines every sub-computation into one result', () => {
    const referenceDate = new Date(2026, 0, 15)
    const items = [
      makeItem({ media: { type: 'movie', title: 'A Movie', genres: ['Action'] }, entry: { watchStatus: 'completed', rating: 9 } })
    ]

    const statistics = computeStatistics({
      items,
      totalEpisodesWatched: 5,
      movieWatchedAts: ['2026-01-10T00:00:00.000Z'],
      episodeWatchedAts: ['2026-01-05T00:00:00.000Z'],
      referenceDate
    })

    expect(statistics.overview.moviesWatched).toBe(1)
    expect(statistics.overview.totalEpisodesWatched).toBe(5)
    expect(statistics.highestRated.map((i) => i.title)).toEqual(['A Movie'])
    expect(statistics.lowestRated.map((i) => i.title)).toEqual(['A Movie'])
    expect(statistics.moviesByMonth.at(-1)).toEqual({ month: '2026-01', count: 1 })
    expect(statistics.episodesByMonth.at(-1)).toEqual({ month: '2026-01', count: 1 })
    expect(statistics.completion.completionRate).toBe(100)
    expect(statistics.favoriteGenres).toEqual([{ genre: 'Action', count: 1 }])
  })
})
