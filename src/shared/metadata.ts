/**
 * Types shared between the main process (metadata providers, IPC handlers)
 * and the renderer (Search / MediaDetail pages). Deliberately independent of
 * src/main/db — the renderer must never need to know about database schema.
 */

export type MediaType = 'movie' | 'tv' | 'anime'
export type MetadataSource = 'tmdb' | 'anilist'

/** Airing/release status, normalized across providers. */
export type MediaStatus = 'airing' | 'finished' | 'upcoming' | 'cancelled'

/**
 * The normalized shape every provider maps its API response into. Used both
 * for search results and for a single title's full details — search results
 * simply leave numberOfSeasons/numberOfEpisodes/status null when the search
 * endpoint doesn't provide them (getDetails always populates what's known).
 *
 * NOTE: `rating` here is the external provider's own aggregate score
 * (e.g. TMDB's community vote average), shown as context in search results.
 * It has nothing to do with this app's personal user rating.
 */
export interface NormalizedMedia {
  externalId: string
  source: MetadataSource
  mediaType: MediaType
  title: string
  originalTitle: string | null
  poster: string | null
  backdrop: string | null
  description: string | null
  releaseDate: string | null
  status: MediaStatus | null
  genres: string[]
  rating: number | null
  numberOfSeasons: number | null
  numberOfEpisodes: number | null
  /**
   * Runtime in minutes. Only meaningful for a movie (a series has no single
   * runtime — see NormalizedEpisode.runtimeMinutes for per-episode length
   * instead); optional and omitted by providers/endpoints that don't carry
   * it, such as a search result rather than a full details fetch.
   */
  runtime?: number | null
  /**
   * Cross-reference ids for the same title on other services (e.g. IMDb),
   * for future matching — not surfaced in the UI yet. Optional and
   * provider-dependent: omitted entirely (rather than `null`) by providers
   * that don't fetch this, and by search results, which never carry it
   * (only a details fetch does).
   */
  externalIds?: Record<string, string>
}

/**
 * A season's own metadata, as reported by the provider. Never persisted in
 * full locally — the DB only stores a season's identifying number once the
 * user interacts with one of its episodes (see src/main/library).
 */
export interface NormalizedSeason {
  seasonNumber: number
  title: string | null
  overview: string | null
  poster: string | null
  airDate: string | null
  episodeCount: number | null
}

/** Same story as NormalizedSeason: live provider data, not duplicated locally. */
export interface NormalizedEpisode {
  episodeNumber: number
  title: string | null
  overview: string | null
  airDate: string | null
  runtimeMinutes: number | null
}

export type ProviderErrorCode = 'missing_config' | 'rate_limited' | 'network' | 'not_found' | 'unknown'

export interface ProviderErrorInfo {
  source: MetadataSource
  code: ProviderErrorCode
  message: string
}

export interface SearchMediaRequest {
  query: string
  /** Omit or leave empty to search every supported type. */
  types?: MediaType[]
}

export interface SearchMediaResponse {
  results: NormalizedMedia[]
  errors: ProviderErrorInfo[]
}

export interface GetMediaDetailsRequest {
  source: MetadataSource
  mediaType: MediaType
  externalId: string
}

export interface GetMediaDetailsResponse {
  result: NormalizedMedia | null
  error: ProviderErrorInfo | null
}

export interface GetSeasonsRequest {
  source: MetadataSource
  mediaType: MediaType
  externalId: string
}

export interface GetSeasonsResponse {
  seasons: NormalizedSeason[]
  error: ProviderErrorInfo | null
}

export interface GetEpisodesRequest {
  source: MetadataSource
  mediaType: MediaType
  externalId: string
  seasonNumber: number
}

export interface GetEpisodesResponse {
  episodes: NormalizedEpisode[]
  error: ProviderErrorInfo | null
}
