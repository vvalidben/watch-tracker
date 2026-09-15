import { describe, expect, it } from 'vitest'
import {
  computeDashboardStats,
  DEFAULT_EPISODE_RUNTIME_MINUTES,
  DEFAULT_MOVIE_RUNTIME_MINUTES,
  type DashboardStatsItem
} from './dashboardStats'

function makeItem(overrides: Partial<DashboardStatsItem> = {}): DashboardStatsItem {
  return {
    type: 'movie',
    watchStatus: 'plan_to_watch',
    rating: null,
    favorite: false,
    runtimeMinutes: null,
    ...overrides
  }
}

describe('computeDashboardStats', () => {
  it('returns all zeros / null for an empty library', () => {
    const stats = computeDashboardStats([], 0)

    expect(stats).toEqual({
      moviesWatched: 0,
      seriesCompleted: 0,
      animeCompleted: 0,
      totalEpisodesWatched: 0,
      estimatedWatchTimeMinutes: 0,
      averagePersonalRating: null,
      favoritesCount: 0
    })
  })

  it('counts completed movies, series, and anime independently by type', () => {
    const items = [
      makeItem({ type: 'movie', watchStatus: 'completed' }),
      makeItem({ type: 'movie', watchStatus: 'completed' }),
      makeItem({ type: 'movie', watchStatus: 'watching' }), // not completed, doesn't count
      makeItem({ type: 'tv', watchStatus: 'completed' }),
      makeItem({ type: 'anime', watchStatus: 'completed' }),
      makeItem({ type: 'anime', watchStatus: 'completed' }),
      makeItem({ type: 'anime', watchStatus: 'dropped' }) // not completed, doesn't count
    ]

    const stats = computeDashboardStats(items, 0)

    expect(stats.moviesWatched).toBe(2)
    expect(stats.seriesCompleted).toBe(1)
    expect(stats.animeCompleted).toBe(2)
  })

  it('passes through totalEpisodesWatched as given, without re-deriving it', () => {
    const stats = computeDashboardStats([], 42)
    expect(stats.totalEpisodesWatched).toBe(42)
  })

  it('counts favorites regardless of type or status', () => {
    const items = [
      makeItem({ favorite: true }),
      makeItem({ favorite: true, type: 'anime' }),
      makeItem({ favorite: false })
    ]

    expect(computeDashboardStats(items, 0).favoritesCount).toBe(2)
  })

  it('averages personal ratings, ignoring unrated items', () => {
    const items = [makeItem({ rating: 8 }), makeItem({ rating: null }), makeItem({ rating: 10 })]

    expect(computeDashboardStats(items, 0).averagePersonalRating).toBe(9)
  })

  it('reports null average rating when nothing is rated', () => {
    const items = [makeItem({ rating: null }), makeItem({ rating: null })]

    expect(computeDashboardStats(items, 0).averagePersonalRating).toBeNull()
  })

  it('estimates watch time using the default per-episode runtime', () => {
    const stats = computeDashboardStats([], 10)
    expect(stats.estimatedWatchTimeMinutes).toBe(10 * DEFAULT_EPISODE_RUNTIME_MINUTES)
  })

  it('estimates watch time for completed movies using the default runtime when none is cached', () => {
    const items = [makeItem({ type: 'movie', watchStatus: 'completed', runtimeMinutes: null })]

    const stats = computeDashboardStats(items, 0)

    expect(stats.estimatedWatchTimeMinutes).toBe(DEFAULT_MOVIE_RUNTIME_MINUTES)
  })

  it('uses a cached real runtime for a movie instead of the default when available', () => {
    const items = [makeItem({ type: 'movie', watchStatus: 'completed', runtimeMinutes: 150 })]

    const stats = computeDashboardStats(items, 0)

    expect(stats.estimatedWatchTimeMinutes).toBe(150)
  })

  it('does not count runtime for a movie that is not completed', () => {
    const items = [makeItem({ type: 'movie', watchStatus: 'watching', runtimeMinutes: 150 })]

    expect(computeDashboardStats(items, 0).estimatedWatchTimeMinutes).toBe(0)
  })

  it('combines movie and episode watch time into one total', () => {
    const items = [
      makeItem({ type: 'movie', watchStatus: 'completed', runtimeMinutes: 100 }),
      makeItem({ type: 'movie', watchStatus: 'completed', runtimeMinutes: 120 })
    ]

    const stats = computeDashboardStats(items, 24)

    expect(stats.estimatedWatchTimeMinutes).toBe(100 + 120 + 24 * DEFAULT_EPISODE_RUNTIME_MINUTES)
  })
})
