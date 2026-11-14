import type { MediaItemDTO } from './library'
import type { NormalizedMedia } from './metadata'

/**
 * Builds a NormalizedMedia-shaped object from what's already cached locally
 * on a library item, for when the live provider fetch fails (no internet,
 * the provider is down, bad credentials). It's missing whatever isn't
 * cached locally — the external rating, and live season/episode lists —
 * but every hook that needs those already handles its own fetch failure
 * gracefully (see useSeasons/useSeriesProgress/useSeriesRatingSummary), so
 * the rest of the detail page still renders and every local-only feature
 * (personal rating, notes, tags, favoriting, watch status) keeps working.
 * Returns null for a 'manual' entry, which has no external id to route
 * further metadata calls to anyway.
 *
 * A pure function with no renderer dependency, so it lives in shared/ (not
 * renderer/lib/) — that's what lets it be unit-tested directly, the same
 * way every other pure module in this folder is.
 */
export function mediaItemToOfflineNormalizedMedia(item: MediaItemDTO): NormalizedMedia | null {
  if (item.source === 'manual' || item.sourceId === null) return null

  return {
    externalId: item.sourceId,
    source: item.source,
    mediaType: item.type,
    title: item.title,
    originalTitle: item.originalTitle,
    poster: item.posterPath,
    backdrop: item.backdropPath,
    description: item.overview,
    releaseDate: item.releaseDate,
    status: item.airingStatus,
    genres: item.genres,
    rating: null,
    numberOfSeasons: item.numberOfSeasons,
    numberOfEpisodes: item.numberOfEpisodes,
    runtime: item.runtimeMinutes ?? undefined
  }
}
