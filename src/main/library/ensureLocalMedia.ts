import type { NormalizedMedia } from '@shared/metadata'
import type { Repositories } from '../db/repositories'
import type { Episode, MediaItem, Season } from '../db/types'

/**
 * Finds the local media_item for this external title, creating it on first
 * touch. The external (source, sourceId) pair is always the identity —
 * never re-derived from title text — so the same title can never be
 * duplicated locally no matter how many times it's added/favorited/rated.
 */
export async function getOrCreateMediaItem(repositories: Repositories, media: NormalizedMedia): Promise<MediaItem> {
  const existing = await repositories.mediaItems.findBySource(media.source, media.externalId)
  if (existing) return existing

  return repositories.mediaItems.create({
    type: media.mediaType,
    title: media.title,
    originalTitle: media.originalTitle,
    overview: media.description,
    posterPath: media.poster,
    backdropPath: media.backdrop,
    releaseDate: media.releaseDate,
    airingStatus: media.status,
    runtimeMinutes: media.runtime ?? null,
    numberOfSeasons: media.numberOfSeasons,
    numberOfEpisodes: media.numberOfEpisodes,
    genres: media.genres.length > 0 ? media.genres : null,
    source: media.source,
    sourceId: media.externalId,
    externalIds: media.externalIds ?? null
  })
}

/**
 * Finds (or lazily creates) the local season row for a given season number.
 * Deliberately stores nothing but the identifying number — title/overview/
 * poster for the season stay in the provider response, fetched live and
 * cached, never copied here. See src/shared/metadata.ts's NormalizedSeason.
 */
export async function getOrCreateSeason(
  repositories: Repositories,
  mediaItemId: number,
  seasonNumber: number
): Promise<Season> {
  const existing = await repositories.seasons.getByMediaItemAndNumber(mediaItemId, seasonNumber)
  if (existing) return existing
  return repositories.seasons.create({ mediaItemId, seasonNumber })
}

/** Same story as getOrCreateSeason: identifying number only, no copied metadata. */
export async function getOrCreateEpisode(
  repositories: Repositories,
  seasonId: number,
  episodeNumber: number
): Promise<Episode> {
  const existing = await repositories.episodes.getBySeasonAndNumber(seasonId, episodeNumber)
  if (existing) return existing
  return repositories.episodes.create({ seasonId, episodeNumber })
}

/**
 * Bulk counterpart used by "mark season watched" / "mark series watched":
 * ensures the season row and every one of its episode rows exist, in as few
 * writes as possible, so marking a 24-episode season doesn't take 24 round
 * trips through getOrCreateSeason/getOrCreateEpisode.
 */
export async function getOrCreateEpisodesForSeason(
  repositories: Repositories,
  mediaItemId: number,
  seasonNumber: number,
  episodeNumbers: number[]
): Promise<{ season: Season; episodes: Episode[] }> {
  const season = await getOrCreateSeason(repositories, mediaItemId, seasonNumber)
  const episodes = await repositories.episodes.ensureMany(season.id, episodeNumbers)
  return { season, episodes }
}
