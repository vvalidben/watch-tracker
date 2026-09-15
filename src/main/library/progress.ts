import type { NormalizedMedia } from '@shared/metadata'
import type { SeriesProgressDTO, WatchStatus } from '@shared/library'
import { calculateOverallProgress, deriveAutoStatus, findCurrentEpisode, type SeasonProgressInput } from '@shared/progress'
import type { MediaSearchService } from '../metadata'
import type { Repositories } from '../db/repositories'

/** Which specific episode numbers of one local season are marked watched. */
async function getLocalWatchedEpisodeNumbers(
  repositories: Repositories,
  mediaItemId: number,
  seasonNumber: number
): Promise<Set<number>> {
  const localSeason = await repositories.seasons.getByMediaItemAndNumber(mediaItemId, seasonNumber)
  if (!localSeason) return new Set()

  const episodesWithProgress = await repositories.episodes.listBySeasonWithProgress(localSeason.id)
  return new Set(
    episodesWithProgress.filter((episode) => episode.progress?.watched).map((episode) => episode.episodeNumber)
  )
}

/**
 * Combines live provider episode counts with local watched data into the
 * full progress summary shown on the detail page ("Season 2, Episode 5/12",
 * "29/87 episodes, 33%") and used to drive automatic status updates.
 * Returns null for a movie — there's no episode progress to summarize.
 *
 * Throws if the provider is unreachable (offline, API down, bad
 * credentials) rather than silently treating "couldn't fetch" the same as
 * "zero seasons" — the latter would show a misleading 0/0 progress bar and
 * could even feed a wrong auto-status decision. Callers that consider this
 * best-effort (see recomputeAndApplyStatus) catch it themselves.
 */
export async function computeSeriesProgress(
  repositories: Repositories,
  metadataService: MediaSearchService,
  media: NormalizedMedia,
  mediaItemId: number
): Promise<SeriesProgressDTO | null> {
  if (media.mediaType === 'movie') return null

  const [seasonsResponse, watchedCounts] = await Promise.all([
    metadataService.getSeasons(media.source, media.mediaType, media.externalId),
    repositories.episodeProgress.getWatchedCountsBySeasonNumber(mediaItemId)
  ])
  if (seasonsResponse.error) throw new Error(seasonsResponse.error.message)

  const seasonInputs: SeasonProgressInput[] = seasonsResponse.seasons.map((season) => ({
    seasonNumber: season.seasonNumber,
    totalEpisodes: season.episodeCount ?? 0,
    watchedEpisodes: watchedCounts.get(season.seasonNumber) ?? 0
  }))
  const overall = calculateOverallProgress(seasonInputs)

  let currentEpisodeNumber: number | null = null
  let currentSeasonTotalEpisodes: number | null = null

  if (overall.currentSeasonNumber !== null) {
    const currentSeasonMeta = seasonsResponse.seasons.find(
      (season) => season.seasonNumber === overall.currentSeasonNumber
    )
    currentSeasonTotalEpisodes = currentSeasonMeta?.episodeCount ?? null

    const [episodesResponse, watchedEpisodeNumbers] = await Promise.all([
      metadataService.getEpisodes(media.source, media.mediaType, media.externalId, overall.currentSeasonNumber),
      getLocalWatchedEpisodeNumbers(repositories, mediaItemId, overall.currentSeasonNumber)
    ])
    if (episodesResponse.error) throw new Error(episodesResponse.error.message)
    currentEpisodeNumber = findCurrentEpisode(
      episodesResponse.episodes.map((episode) => episode.episodeNumber),
      watchedEpisodeNumbers
    )
  }

  return { ...overall, currentSeasonTotalEpisodes, currentEpisodeNumber }
}

/**
 * Recomputes progress after a watched-state change and applies the
 * intelligent status rule (see deriveAutoStatus), writing the new status
 * only when it actually differs. No-op for a movie.
 *
 * This runs as a side effect of an already-successful local mutation (an
 * episode was just marked watched/unwatched, which is fully offline —
 * see ensureLocalMedia.ts). If the provider is unreachable, that shouldn't
 * undo or fail the mutation that already happened: the status simply isn't
 * refreshed this time, and will catch up next time the provider is
 * reachable (every watched-toggle recomputes from scratch, nothing here is
 * incremental state that could drift permanently).
 */
export async function recomputeAndApplyStatus(
  repositories: Repositories,
  metadataService: MediaSearchService,
  media: NormalizedMedia,
  mediaItemId: number,
  libraryEntryId: number,
  currentStatus: WatchStatus
): Promise<void> {
  let progress: SeriesProgressDTO | null
  try {
    progress = await computeSeriesProgress(repositories, metadataService, media, mediaItemId)
  } catch (error) {
    console.warn('[progress] skipping auto-status recompute — provider unreachable', error)
    return
  }
  if (!progress) return

  const nextStatus = deriveAutoStatus(progress, currentStatus)
  if (nextStatus !== currentStatus) {
    await repositories.libraryEntries.updateStatus(libraryEntryId, nextStatus)
  }
}
