import { ProviderError } from './errors'
import { fetchJson } from './httpClient'
import type {
  TmdbConfig,
  TmdbGenreListResponse,
  TmdbMovieItem,
  TmdbSearchResponse,
  TmdbSeasonDetailsResponse,
  TmdbTvItem
} from './tmdbTypes'

/**
 * Thin wrapper around TMDB's REST API: builds authenticated URLs and
 * returns TMDB's own response shapes, unmapped — normalization into this
 * app's internal types happens one layer up, in tmdbMapper.ts. Nothing here
 * knows about NormalizedMedia/NormalizedSeason/etc.
 */
export function createTmdbClient(config: TmdbConfig) {
  const apiBaseUrl = config.apiBaseUrl ?? 'https://api.themoviedb.org/3'

  function withKey(url: string): string {
    const separator = url.includes('?') ? '&' : '?'
    return `${url}${separator}api_key=${encodeURIComponent(config.apiKey)}`
  }

  /** Rethrows a not_found error with context naming exactly what was being requested. */
  async function withNotFoundContext<T>(what: string, run: () => Promise<T>): Promise<T> {
    try {
      return await run()
    } catch (error) {
      if (error instanceof ProviderError && error.code === 'not_found') {
        throw new ProviderError('not_found', `${what} not found`, error.status)
      }
      throw error
    }
  }

  return {
    searchMovies(query: string): Promise<TmdbSearchResponse<TmdbMovieItem>> {
      return fetchJson(withKey(`${apiBaseUrl}/search/movie?query=${encodeURIComponent(query)}`))
    },

    searchTv(query: string): Promise<TmdbSearchResponse<TmdbTvItem>> {
      return fetchJson(withKey(`${apiBaseUrl}/search/tv?query=${encodeURIComponent(query)}`))
    },

    getMovieGenres(): Promise<TmdbGenreListResponse> {
      return fetchJson(withKey(`${apiBaseUrl}/genre/movie/list`))
    },

    getTvGenres(): Promise<TmdbGenreListResponse> {
      return fetchJson(withKey(`${apiBaseUrl}/genre/tv/list`))
    },

    getMovieDetails(externalId: string): Promise<TmdbMovieItem> {
      return withNotFoundContext('Movie', () =>
        fetchJson(withKey(`${apiBaseUrl}/movie/${externalId}?append_to_response=external_ids`))
      )
    },

    getTvDetails(externalId: string): Promise<TmdbTvItem> {
      return withNotFoundContext('Series', () =>
        fetchJson(withKey(`${apiBaseUrl}/tv/${externalId}?append_to_response=external_ids`))
      )
    },

    getSeasonDetails(externalId: string, seasonNumber: number): Promise<TmdbSeasonDetailsResponse> {
      return withNotFoundContext(`Season ${seasonNumber}`, () =>
        fetchJson(withKey(`${apiBaseUrl}/tv/${externalId}/season/${seasonNumber}`))
      )
    }
  }
}

export type TmdbClient = ReturnType<typeof createTmdbClient>
