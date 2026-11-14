import { describe, expect, it } from 'vitest'
import { buildCalendarMonth, countMonthEntries, localDayKey, watchLogLabel, type WatchLogEntry } from './watchLog'

function entry(overrides: Partial<WatchLogEntry>): WatchLogEntry {
  return {
    mediaItemId: 1,
    title: 'Show',
    mediaType: 'tv',
    source: 'tmdb',
    sourceId: '1',
    numberOfSeasons: 1,
    watchedAt: new Date(2026, 10, 5, 12).toISOString(),
    seasonNumber: 1,
    episodeNumber: 3,
    ...overrides
  }
}

describe('watchLogLabel', () => {
  it('labels a movie event as a film', () => {
    expect(watchLogLabel(entry({ mediaType: 'movie', seasonNumber: null, episodeNumber: null }))).toBe('Film')
  })

  it('omits the season for a single-season show', () => {
    expect(watchLogLabel(entry({ numberOfSeasons: 1, seasonNumber: 1, episodeNumber: 3 }))).toBe('E3')
  })

  it('includes the season for a multi-season show', () => {
    expect(watchLogLabel(entry({ numberOfSeasons: 4, seasonNumber: 2, episodeNumber: 5 }))).toBe('S2 · E5')
  })

  it('includes the season when the watched season is not the first, even if the season count is unknown', () => {
    expect(watchLogLabel(entry({ numberOfSeasons: null, seasonNumber: 0, episodeNumber: 1 }))).toBe('S0 · E1')
  })
})

describe('localDayKey', () => {
  it('uses the local calendar day, not the UTC one', () => {
    expect(localDayKey(new Date(2026, 0, 2, 23, 30).toISOString())).toBe('2026-01-02')
    expect(localDayKey(new Date(2026, 0, 2, 0, 30).toISOString())).toBe('2026-01-02')
  })

  it('returns null for an unparseable date', () => {
    expect(localDayKey('not a date')).toBeNull()
  })
})

describe('buildCalendarMonth', () => {
  it('covers whole Monday-first weeks around the month', () => {
    // November 2026 starts on a Sunday and ends on a Monday.
    const days = buildCalendarMonth(2026, 10, [])

    expect(days[0].dayKey).toBe('2026-10-26')
    expect(days[0].inMonth).toBe(false)
    expect(days[6].dayKey).toBe('2026-11-01')
    expect(days[6].inMonth).toBe(true)
    expect(days.at(-1)?.dayKey).toBe('2026-12-06')
    expect(days.length % 7).toBe(0)
  })

  it('places entries on their local day and groups them per title', () => {
    const days = buildCalendarMonth(2026, 10, [
      entry({ mediaItemId: 1, title: 'A', episodeNumber: 1 }),
      entry({ mediaItemId: 1, title: 'A', episodeNumber: 2 }),
      entry({ mediaItemId: 2, title: 'B', episodeNumber: 1 })
    ])

    const day = days.find((candidate) => candidate.dayKey === '2026-11-05')
    expect(day?.entries).toHaveLength(3)
    expect(day?.titles).toEqual([
      { mediaItemId: 1, title: 'A', count: 2 },
      { mediaItemId: 2, title: 'B', count: 1 }
    ])
  })
})

describe('countMonthEntries', () => {
  it('counts only that month, splitting episodes from films', () => {
    const counts = countMonthEntries(
      [
        entry({}),
        entry({ episodeNumber: 4 }),
        entry({ mediaType: 'movie', seasonNumber: null, episodeNumber: null }),
        entry({ watchedAt: new Date(2026, 9, 31, 12).toISOString() })
      ],
      2026,
      10
    )

    expect(counts).toEqual({ episodes: 2, films: 1 })
  })
})
