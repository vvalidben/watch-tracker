import type { MediaType, NormalizedEpisode, NormalizedMedia, NormalizedSeason } from '@shared/metadata'
import { ProviderError } from './errors'
import { createTmdbClient } from './tmdbClient'
import {
  normalizeEpisode,
  normalizeMovie,
  normalizeSeason,
  normalizeTv,
  resolveGenreNames
} from './tmdbMapper'
import type { TmdbConfig } from './tmdbTypes'
import type { MediaSearchProvider } from './provider'

export type { TmdbConfig } from './tmdbTypes'

/**
 * The TMDB implementation of MediaSearchProvider — movies and TV series
 * only (anime search is AniList's job, see anilistProvider.ts). This file
 * only composes tmdbClient (raw HTTP) with tmdbMapper (pure normalization);
 * neither TMDB's response shapes nor its URL/auth details leak past it.
 */
export function createTmdbProvider(config: TmdbConfig): MediaSearchProvider {
  const client = createTmdbClient(config)
  const imageBaseUrl = config.imageBaseUrl ?? 'https://image.tmdb.org/t/p'

  // Genre id -> name maps rarely change and are the same for every request
  // in a session, so they're fetched once and kept for this provider
  // instance's lifetime (which is the whole app session — see metadata/index.ts).
  let genreNamesById: { movie: Map<number, string>; tv: Map<number, string> } | undefined

  async function loadGenreNames(): Promise<{ movie: Map<number, string>; tv: Map<number, string> }> {
    if (genreNamesById) return genreNamesById
    const [movieGenres, tvGenres] = await Promise.all([client.getMovieGenres(), client.getTvGenres()])
    genreNamesById = {
      movie: new Map(movieGenres.genres.map((genre) => [genre.id, genre.name])),
      tv: new Map(tvGenres.genres.map((genre) => [genre.id, genre.name]))
    }
    return genreNamesById
  }

  return {
    source: 'tmdb',
    supportedTypes: ['movie', 'tv'],

    async search(query: string, type: MediaType): Promise<NormalizedMedia[]> {
      if (type !== 'movie' && type !== 'tv') return []

      const genreNames = await loadGenreNames()

      if (type === 'movie') {
        const data = await client.searchMovies(query)
        return data.results.map((item) =>
          normalizeMovie(item, resolveGenreNames(item, genreNames.movie), imageBaseUrl)
        )
      }

      const data = await client.searchTv(query)
      return data.results.map((item) => normalizeTv(item, resolveGenreNames(item, genreNames.tv), imageBaseUrl))
    },

    async getDetails(externalId: string, type: MediaType): Promise<NormalizedMedia> {
      if (type !== 'movie' && type !== 'tv') {
        throw new ProviderError('unknown', `TMDB does not support media type "${type}"`)
      }

      if (type === 'movie') {
        const details = await client.getMovieDetails(externalId)
        return normalizeMovie(details, resolveGenreNames(details, new Map()), imageBaseUrl)
      }

      const details = await client.getTvDetails(externalId)
      return normalizeTv(details, resolveGenreNames(details, new Map()), imageBaseUrl)
    },

    async getSeasons(externalId: string, type: MediaType): Promise<NormalizedSeason[]> {
      if (type !== 'tv') return []

      const details = await client.getTvDetails(externalId)
      return (details.seasons ?? [])
        .slice()
        .sort((a, b) => a.season_number - b.season_number)
        .map((season) => normalizeSeason(season, imageBaseUrl))
    },

    async getEpisodes(externalId: string, type: MediaType, seasonNumber: number): Promise<NormalizedEpisode[]> {
      if (type !== 'tv') return []

      const details = await client.getSeasonDetails(externalId, seasonNumber)
      return details.episodes.map(normalizeEpisode)
    }
  }
}
