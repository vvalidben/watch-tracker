import { averageRating } from '@shared/ratings'
import type { Repositories } from '../db/repositories'

export interface SeriesRatingRollup {
  averageSeasonRating: number | null
  averageEpisodeRating: number | null
}

/**
 * Rolls up every season's personal rating and every episode's personal
 * rating (across all of a media item's LOCAL seasons — untouched seasons
 * simply contribute nothing) into two series-wide averages. Purely local:
 * no provider/network call needed, since ratings are personal data that
 * only ever lives in this app's own database.
 */
export async function computeSeriesRatingRollup(
  repositories: Repositories,
  mediaItemId: number
): Promise<SeriesRatingRollup> {
  const seasons = await repositories.seasons.listByMediaItem(mediaItemId)

  const seasonRatings: (number | null)[] = []
  const episodeRatings: (number | null)[] = []

  for (const season of seasons) {
    const seasonRating = await repositories.seasonRatings.getBySeasonId(season.id)
    seasonRatings.push(seasonRating?.rating ?? null)

    const episodes = await repositories.episodes.listBySeasonWithProgress(season.id)
    for (const episode of episodes) {
      episodeRatings.push(episode.progress?.rating ?? null)
    }
  }

  return {
    averageSeasonRating: averageRating(seasonRatings),
    averageEpisodeRating: averageRating(episodeRatings)
  }
}
