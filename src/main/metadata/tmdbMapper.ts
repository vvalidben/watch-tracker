import type { MediaStatus, NormalizedEpisode, NormalizedMedia, NormalizedSeason } from '@shared/metadata'
import type {
  TmdbEpisodeItem,
  TmdbExternalIds,
  TmdbGenre,
  TmdbMovieItem,
  TmdbSeasonSummary,
  TmdbTvItem
} from './tmdbTypes'

/**
 * Pure TMDB → internal-normalized-type mapping. Nothing here touches the
 * network — every function is a plain, deterministic transform, which is
 * what makes it possible to test "response mapping" and "missing fields"
 * exhaustively without mocking fetch at all (see tmdbMapper.test.ts).
 */

export function posterUrl(path: string | null | undefined, imageBaseUrl: string): string | null {
  return path ? `${imageBaseUrl}/w500${path}` : null
}

export function backdropUrl(path: string | null | undefined, imageBaseUrl: string): string | null {
  return path ? `${imageBaseUrl}/w1280${path}` : null
}

export function mapMovieStatus(status: string | undefined): MediaStatus | null {
  switch (status) {
    case 'Released':
      return 'finished'
    case 'Canceled':
      return 'cancelled'
    case 'Rumored':
    case 'Planned':
    case 'In Production':
    case 'Post Production':
      return 'upcoming'
    default:
      return null
  }
}

export function mapTvStatus(status: string | undefined): MediaStatus | null {
  switch (status) {
    case 'Returning Series':
      return 'airing'
    case 'Ended':
      return 'finished'
    case 'Canceled':
      return 'cancelled'
    case 'Planned':
    case 'In Production':
    case 'Pilot':
      return 'upcoming'
    default:
      return null
  }
}

/** Search results only ever carry `genre_ids`; a details fetch carries full `genres` objects instead. */
export function resolveGenreNames(
  item: { genre_ids?: number[]; genres?: TmdbGenre[] },
  genreMap: Map<number, string>
): string[] {
  if (item.genres) return item.genres.map((genre) => genre.name)
  return (item.genre_ids ?? []).map((id) => genreMap.get(id)).filter((name): name is string => Boolean(name))
}

/** `imdb_id`/etc. are only present when the caller appended `external_ids` to the request — see tmdbClient.ts. */
export function normalizeExternalIds(externalIds: TmdbExternalIds | undefined): Record<string, string> | undefined {
  if (!externalIds) return undefined
  const result: Record<string, string> = {}
  if (externalIds.imdb_id) result.imdb = externalIds.imdb_id
  if (externalIds.tvdb_id) result.tvdb = String(externalIds.tvdb_id)
  return Object.keys(result).length > 0 ? result : undefined
}

/**
 * Handles a movie response missing supposedly-required fields (a malformed
 * or unexpectedly-shaped API response) by falling back to safe defaults
 * rather than propagating `undefined` into a field this app's types
 * declare as always present.
 */
export function normalizeMovie(item: Partial<TmdbMovieItem>, genreNames: string[], imageBaseUrl: string): NormalizedMedia {
  return {
    externalId: String(item.id ?? ''),
    source: 'tmdb',
    mediaType: 'movie',
    title: item.title ?? 'Untitled',
    originalTitle: item.original_title && item.original_title !== item.title ? item.original_title : null,
    poster: posterUrl(item.poster_path, imageBaseUrl),
    backdrop: backdropUrl(item.backdrop_path, imageBaseUrl),
    description: item.overview || null,
    releaseDate: item.release_date || null,
    status: mapMovieStatus(item.status),
    genres: genreNames,
    rating: typeof item.vote_average === 'number' ? item.vote_average : null,
    numberOfSeasons: null,
    numberOfEpisodes: null,
    runtime: typeof item.runtime === 'number' ? item.runtime : null,
    externalIds: normalizeExternalIds(item.external_ids)
  }
}

export function normalizeTv(item: Partial<TmdbTvItem>, genreNames: string[], imageBaseUrl: string): NormalizedMedia {
  return {
    externalId: String(item.id ?? ''),
    source: 'tmdb',
    mediaType: 'tv',
    title: item.name ?? 'Untitled',
    originalTitle: item.original_name && item.original_name !== item.name ? item.original_name : null,
    poster: posterUrl(item.poster_path, imageBaseUrl),
    backdrop: backdropUrl(item.backdrop_path, imageBaseUrl),
    description: item.overview || null,
    releaseDate: item.first_air_date || null,
    status: mapTvStatus(item.status),
    genres: genreNames,
    rating: typeof item.vote_average === 'number' ? item.vote_average : null,
    numberOfSeasons: item.number_of_seasons ?? null,
    numberOfEpisodes: item.number_of_episodes ?? null,
    externalIds: normalizeExternalIds(item.external_ids)
  }
}

export function normalizeSeason(season: Partial<TmdbSeasonSummary>, imageBaseUrl: string): NormalizedSeason {
  return {
    seasonNumber: season.season_number ?? 0,
    title: season.name || null,
    overview: season.overview || null,
    poster: posterUrl(season.poster_path, imageBaseUrl),
    airDate: season.air_date || null,
    episodeCount: season.episode_count ?? null
  }
}

export function normalizeEpisode(episode: Partial<TmdbEpisodeItem>): NormalizedEpisode {
  return {
    episodeNumber: episode.episode_number ?? 0,
    title: episode.name || null,
    overview: episode.overview || null,
    airDate: episode.air_date || null,
    runtimeMinutes: episode.runtime ?? null
  }
}
