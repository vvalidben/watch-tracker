import type { WatchStatus } from './library'

/** TMDB's "Specials" season — excluded from progress/completion math (see calculateOverallProgress). */
const SPECIALS_SEASON_NUMBER = 0

export interface SeasonProgressInput {
  seasonNumber: number
  totalEpisodes: number
  watchedEpisodes: number
}

export interface OverallProgress {
  watchedEpisodes: number
  totalEpisodes: number
  /** 0-100, rounded to the nearest whole percent. 0 when totalEpisodes is 0. */
  percentage: number
  /** The first not-fully-watched season, or the last season if everything is watched, or null with no seasons. */
  currentSeasonNumber: number | null
  isFullyWatched: boolean
}

/**
 * Rolls up per-season counts into overall series progress. Season 0
 * ("Specials" on TMDB) is deliberately excluded: specials are bonus content
 * outside the main numbered run, and folding them into "did you finish the
 * show" would make 100% completion depend on watching bonus episodes most
 * people don't count as part of the series.
 *
 * Matches the worked example from the spec: Attack on Titan S1 (25/25) +
 * S2 (4/12, i.e. "on episode 5") + S3 (0/22) + S4 parts (0/16, 0/12) =
 * 29/87 watched = 33%, with season 2 reported as current.
 */
export function calculateOverallProgress(seasons: SeasonProgressInput[]): OverallProgress {
  const mainSeasons = seasons.filter((season) => season.seasonNumber !== SPECIALS_SEASON_NUMBER)

  const totalEpisodes = mainSeasons.reduce((sum, season) => sum + Math.max(0, season.totalEpisodes), 0)
  const watchedEpisodes = mainSeasons.reduce((sum, season) => {
    const total = Math.max(0, season.totalEpisodes)
    const watched = Math.max(0, season.watchedEpisodes)
    // Clamp defensively: local progress should never outrun the provider's
    // own episode count, but don't let a data mismatch produce >100%.
    return sum + Math.min(watched, total)
  }, 0)

  const percentage = totalEpisodes > 0 ? Math.round((watchedEpisodes / totalEpisodes) * 100) : 0
  const isFullyWatched = totalEpisodes > 0 && watchedEpisodes >= totalEpisodes

  const bySeasonNumber = [...mainSeasons].sort((a, b) => a.seasonNumber - b.seasonNumber)
  const firstIncomplete = bySeasonNumber.find((season) => season.watchedEpisodes < season.totalEpisodes)
  const currentSeasonNumber = firstIncomplete
    ? firstIncomplete.seasonNumber
    : (bySeasonNumber.at(-1)?.seasonNumber ?? null)

  return { watchedEpisodes, totalEpisodes, percentage, currentSeasonNumber, isFullyWatched }
}

/**
 * The "current" episode within a season is the first unwatched one in
 * number order (i.e. what you'd watch next) — or the last episode if the
 * season is fully watched, so a completed season still reports something
 * sensible ("Episode 12/12") instead of null.
 */
export function findCurrentEpisode(
  episodeNumbers: readonly number[],
  watchedEpisodeNumbers: ReadonlySet<number>
): number | null {
  const sorted = [...episodeNumbers].sort((a, b) => a - b)
  const nextUnwatched = sorted.find((episodeNumber) => !watchedEpisodeNumbers.has(episodeNumber))
  if (nextUnwatched !== undefined) return nextUnwatched
  return sorted.length > 0 ? sorted[sorted.length - 1] : null
}

/**
 * The status auto-update rule:
 *   - all episodes watched -> always 'completed' (a strong, unambiguous
 *     signal that overrides even a manual on_hold/dropped)
 *   - otherwise, 'on_hold' and 'dropped' are sticky: they were a deliberate
 *     manual choice and watching one more episode shouldn't silently undo it
 *   - zero watched -> 'plan_to_watch'; some but not all -> 'watching'
 */
export function deriveAutoStatus(
  progress: { watchedEpisodes: number; totalEpisodes: number },
  currentStatus: WatchStatus
): WatchStatus {
  if (progress.totalEpisodes > 0 && progress.watchedEpisodes >= progress.totalEpisodes) {
    return 'completed'
  }
  if (currentStatus === 'on_hold' || currentStatus === 'dropped') {
    return currentStatus
  }
  if (progress.watchedEpisodes <= 0) {
    return 'plan_to_watch'
  }
  return 'watching'
}
