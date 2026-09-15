import { describe, expect, it } from 'vitest'
import { calculateOverallProgress, deriveAutoStatus, findCurrentEpisode, type SeasonProgressInput } from './progress'

describe('calculateOverallProgress', () => {
  it('returns all zeros / nulls for a show with no season data at all', () => {
    const result = calculateOverallProgress([])

    expect(result).toEqual({
      watchedEpisodes: 0,
      totalEpisodes: 0,
      percentage: 0,
      currentSeasonNumber: null,
      isFullyWatched: false
    })
  })

  it('matches the worked example from the spec (Attack on Titan)', () => {
    const seasons: SeasonProgressInput[] = [
      { seasonNumber: 1, totalEpisodes: 25, watchedEpisodes: 25 },
      { seasonNumber: 2, totalEpisodes: 12, watchedEpisodes: 4 },
      { seasonNumber: 3, totalEpisodes: 22, watchedEpisodes: 0 },
      { seasonNumber: 4, totalEpisodes: 16, watchedEpisodes: 0 },
      { seasonNumber: 5, totalEpisodes: 12, watchedEpisodes: 0 }
    ]

    const result = calculateOverallProgress(seasons)

    expect(result.totalEpisodes).toBe(87)
    expect(result.watchedEpisodes).toBe(29)
    expect(result.percentage).toBe(33)
    expect(result.currentSeasonNumber).toBe(2)
    expect(result.isFullyWatched).toBe(false)
  })

  it('reports 0% and the only season as current for a freshly-added show', () => {
    const result = calculateOverallProgress([{ seasonNumber: 1, totalEpisodes: 12, watchedEpisodes: 0 }])

    expect(result.percentage).toBe(0)
    expect(result.currentSeasonNumber).toBe(1)
    expect(result.isFullyWatched).toBe(false)
  })

  it('reports 100% and isFullyWatched once every season is fully watched', () => {
    const result = calculateOverallProgress([
      { seasonNumber: 1, totalEpisodes: 12, watchedEpisodes: 12 },
      { seasonNumber: 2, totalEpisodes: 8, watchedEpisodes: 8 }
    ])

    expect(result.percentage).toBe(100)
    expect(result.isFullyWatched).toBe(true)
    // Every season is complete, so "current" falls back to the last one.
    expect(result.currentSeasonNumber).toBe(2)
  })

  it('picks the first incomplete season by number, not by array order', () => {
    const result = calculateOverallProgress([
      { seasonNumber: 3, totalEpisodes: 10, watchedEpisodes: 0 },
      { seasonNumber: 1, totalEpisodes: 10, watchedEpisodes: 10 },
      { seasonNumber: 2, totalEpisodes: 10, watchedEpisodes: 5 }
    ])

    expect(result.currentSeasonNumber).toBe(2)
  })

  it('excludes season 0 (specials) from totals and from being picked as current', () => {
    const withSpecials = calculateOverallProgress([
      { seasonNumber: 0, totalEpisodes: 5, watchedEpisodes: 0 },
      { seasonNumber: 1, totalEpisodes: 12, watchedEpisodes: 12 }
    ])
    const withoutSpecials = calculateOverallProgress([{ seasonNumber: 1, totalEpisodes: 12, watchedEpisodes: 12 }])

    expect(withSpecials).toEqual(withoutSpecials)
    expect(withSpecials.isFullyWatched).toBe(true)
    expect(withSpecials.currentSeasonNumber).toBe(1)
  })

  it('clamps a season whose watched count exceeds its total instead of exceeding 100%', () => {
    // Defensive case: provider-reported episodeCount shrank, or local data drifted.
    const result = calculateOverallProgress([{ seasonNumber: 1, totalEpisodes: 10, watchedEpisodes: 15 }])

    expect(result.watchedEpisodes).toBe(10)
    expect(result.percentage).toBe(100)
    expect(result.isFullyWatched).toBe(true)
  })

  it('rounds percentage to the nearest whole number', () => {
    expect(calculateOverallProgress([{ seasonNumber: 1, totalEpisodes: 3, watchedEpisodes: 1 }]).percentage).toBe(33)
    expect(calculateOverallProgress([{ seasonNumber: 1, totalEpisodes: 3, watchedEpisodes: 2 }]).percentage).toBe(67)
  })
})

describe('findCurrentEpisode', () => {
  it('returns null when the season has no known episodes', () => {
    expect(findCurrentEpisode([], new Set())).toBeNull()
  })

  it('returns the first episode when nothing is watched', () => {
    expect(findCurrentEpisode([1, 2, 3], new Set())).toBe(1)
  })

  it('returns the next sequential unwatched episode', () => {
    expect(findCurrentEpisode([1, 2, 3, 4, 5], new Set([1, 2, 3, 4]))).toBe(5)
  })

  it('returns the first gap when episodes were watched out of order', () => {
    expect(findCurrentEpisode([1, 2, 3, 4], new Set([1, 3]))).toBe(2)
  })

  it('returns the last episode once every episode is watched', () => {
    expect(findCurrentEpisode([1, 2, 3], new Set([1, 2, 3]))).toBe(3)
  })

  it('sorts its input rather than assuming it arrives in order', () => {
    expect(findCurrentEpisode([5, 3, 1, 4, 2], new Set([1, 2]))).toBe(3)
  })
})

describe('deriveAutoStatus', () => {
  it('maps zero watched episodes to plan_to_watch', () => {
    expect(deriveAutoStatus({ watchedEpisodes: 0, totalEpisodes: 12 }, 'watching')).toBe('plan_to_watch')
  })

  it('maps partial progress to watching', () => {
    expect(deriveAutoStatus({ watchedEpisodes: 4, totalEpisodes: 12 }, 'plan_to_watch')).toBe('watching')
  })

  it('maps complete progress to completed', () => {
    expect(deriveAutoStatus({ watchedEpisodes: 12, totalEpisodes: 12 }, 'watching')).toBe('completed')
  })

  it('overrides a contradictory completed status back to watching on partial progress', () => {
    expect(deriveAutoStatus({ watchedEpisodes: 4, totalEpisodes: 12 }, 'completed')).toBe('watching')
  })

  it('treats on_hold as sticky under partial progress', () => {
    expect(deriveAutoStatus({ watchedEpisodes: 4, totalEpisodes: 12 }, 'on_hold')).toBe('on_hold')
  })

  it('treats dropped as sticky under partial progress', () => {
    expect(deriveAutoStatus({ watchedEpisodes: 4, totalEpisodes: 12 }, 'dropped')).toBe('dropped')
  })

  it('treats dropped as sticky even at zero progress (does not force plan_to_watch)', () => {
    expect(deriveAutoStatus({ watchedEpisodes: 0, totalEpisodes: 12 }, 'dropped')).toBe('dropped')
  })

  it('treats on_hold as sticky even at zero progress', () => {
    expect(deriveAutoStatus({ watchedEpisodes: 0, totalEpisodes: 12 }, 'on_hold')).toBe('on_hold')
  })

  it('completing every episode always wins, even over on_hold', () => {
    expect(deriveAutoStatus({ watchedEpisodes: 12, totalEpisodes: 12 }, 'on_hold')).toBe('completed')
  })

  it('completing every episode always wins, even over dropped', () => {
    expect(deriveAutoStatus({ watchedEpisodes: 12, totalEpisodes: 12 }, 'dropped')).toBe('completed')
  })

  it('treats totalEpisodes of 0 (no episode data yet) as not-yet-complete', () => {
    expect(deriveAutoStatus({ watchedEpisodes: 0, totalEpisodes: 0 }, 'plan_to_watch')).toBe('plan_to_watch')
  })
})
