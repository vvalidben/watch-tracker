import type { Repositories } from '../db/repositories'

/** Records one episode watch event. Call only on a transition TO watched — never on unwatch. */
export async function recordEpisodeWatched(
  repositories: Repositories,
  mediaItemId: number,
  episodeId: number,
  watchedAt: string
): Promise<void> {
  await repositories.watchEvents.record(mediaItemId, episodeId, watchedAt)
}

/** Bulk counterpart for "mark season/series watched." Call only when marking watched, never when unmarking. */
export async function recordEpisodesWatched(
  repositories: Repositories,
  mediaItemId: number,
  episodeIds: number[],
  watchedAt: string
): Promise<void> {
  await repositories.watchEvents.recordMany(mediaItemId, episodeIds, watchedAt)
}

/**
 * Records a movie watch event and recomputes its rewatch count from the
 * resulting history — the count is always derived from watch_events (the
 * source of truth) rather than incremented independently, so it can never
 * drift out of sync with the dates actually recorded.
 */
export async function recordMovieWatched(
  repositories: Repositories,
  mediaItemId: number,
  libraryEntryId: number,
  watchedAt: string
): Promise<void> {
  await repositories.watchEvents.record(mediaItemId, null, watchedAt)
  const totalWatches = await repositories.watchEvents.countForMovie(mediaItemId)
  await repositories.libraryEntries.setRewatchCount(libraryEntryId, Math.max(0, totalWatches - 1))
}
