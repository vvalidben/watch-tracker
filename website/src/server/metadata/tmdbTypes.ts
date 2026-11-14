/**
 * Raw TMDB API response shapes. Deliberately kept in their own file and
 * never imported outside this provider's own files (tmdbClient.ts,
 * tmdbMapper.ts, tmdbProvider.ts) — the rest of the app only ever sees the
 * normalized types in @shared/metadata.
 */

export interface TmdbConfig {
  apiKey: string
  apiBaseUrl?: string
  imageBaseUrl?: string
}

export interface TmdbGenre {
  id: number
  name: string
}

export interface TmdbSeasonSummary {
  season_number: number
  name: string | null
  overview: string | null
  poster_path: string | null
  air_date: string | null
  episode_count: number | null
}

export interface TmdbEpisodeItem {
  episode_number: number
  name: string | null
  overview: string | null
  air_date: string | null
  runtime: number | null
}

export interface TmdbExternalIds {
  imdb_id?: string | null
  tvdb_id?: number | null
}

export interface TmdbMovieItem {
  id: number
  title: string
  original_title: string
  overview: string | null
  poster_path: string | null
  backdrop_path: string | null
  release_date: string | null
  runtime?: number | null
  vote_average: number | null
  status?: string
  genre_ids?: number[]
  genres?: TmdbGenre[]
  /** Present only when the details request appended `external_ids`. */
  external_ids?: TmdbExternalIds
}

export interface TmdbTvItem {
  id: number
  name: string
  original_name: string
  overview: string | null
  poster_path: string | null
  backdrop_path: string | null
  first_air_date: string | null
  vote_average: number | null
  status?: string
  genre_ids?: number[]
  genres?: TmdbGenre[]
  number_of_seasons?: number | null
  number_of_episodes?: number | null
  seasons?: TmdbSeasonSummary[]
  /** Present only when the details request appended `external_ids`. */
  external_ids?: TmdbExternalIds
}

export interface TmdbSearchResponse<T> {
  results: T[]
}

export interface TmdbGenreListResponse {
  genres: TmdbGenre[]
}

export interface TmdbSeasonDetailsResponse {
  episodes: TmdbEpisodeItem[]
}
