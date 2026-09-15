import type {
  GetMediaDetailsResponse,
  GetSeasonsResponse,
  GetEpisodesResponse,
  MediaType,
  MetadataSource,
  ProviderErrorInfo,
  SearchMediaResponse
} from '@shared/metadata'
import { toProviderError } from './errors'
import type { MediaSearchProvider } from './provider'

const ALL_TYPES: MediaType[] = ['movie', 'tv', 'anime']

export interface MediaSearchService {
  search(query: string, types?: MediaType[]): Promise<SearchMediaResponse>
  getDetails(source: MetadataSource, mediaType: MediaType, externalId: string): Promise<GetMediaDetailsResponse>
  getSeasons(source: MetadataSource, mediaType: MediaType, externalId: string): Promise<GetSeasonsResponse>
  getEpisodes(
    source: MetadataSource,
    mediaType: MediaType,
    externalId: string,
    seasonNumber: number
  ): Promise<GetEpisodesResponse>
}

/** Which provider's source to blame in an error when no provider is configured for a type. */
function defaultSourceFor(type: MediaType): MetadataSource {
  return type === 'anime' ? 'anilist' : 'tmdb'
}

/**
 * Fans a search out to whichever configured provider handles each requested
 * type, running them in parallel and tolerating partial failure: if TMDB is
 * unreachable but AniList works, anime results still come back alongside a
 * reported error for movies/TV rather than failing the whole search.
 */
export function createMediaSearchService(providers: MediaSearchProvider[]): MediaSearchService {
  function providerFor(type: MediaType): MediaSearchProvider | undefined {
    return providers.find((provider) => provider.supportedTypes.includes(type))
  }

  function providerForSource(source: MetadataSource): MediaSearchProvider | undefined {
    return providers.find((provider) => provider.source === source)
  }

  function missingConfigError(source: MetadataSource): ProviderErrorInfo {
    return { source, code: 'missing_config', message: `No provider is configured for "${source}".` }
  }

  return {
    async search(query: string, types?: MediaType[]): Promise<SearchMediaResponse> {
      const requestedTypes = types && types.length > 0 ? types : ALL_TYPES
      const results: SearchMediaResponse['results'] = []
      const errors: ProviderErrorInfo[] = []

      await Promise.all(
        requestedTypes.map(async (type) => {
          const provider = providerFor(type)
          if (!provider) {
            errors.push({
              source: defaultSourceFor(type),
              code: 'missing_config',
              message: `No provider is configured for "${type}" search.`
            })
            return
          }
          try {
            results.push(...(await provider.search(query, type)))
          } catch (error) {
            const providerError = toProviderError(error)
            errors.push({ source: provider.source, code: providerError.code, message: providerError.message })
          }
        })
      )

      return { results, errors }
    },

    async getDetails(
      source: MetadataSource,
      mediaType: MediaType,
      externalId: string
    ): Promise<GetMediaDetailsResponse> {
      const provider = providerForSource(source)
      if (!provider) return { result: null, error: missingConfigError(source) }
      try {
        const result = await provider.getDetails(externalId, mediaType)
        return { result, error: null }
      } catch (error) {
        const providerError = toProviderError(error)
        return { result: null, error: { source, code: providerError.code, message: providerError.message } }
      }
    },

    async getSeasons(
      source: MetadataSource,
      mediaType: MediaType,
      externalId: string
    ): Promise<GetSeasonsResponse> {
      const provider = providerForSource(source)
      if (!provider) return { seasons: [], error: missingConfigError(source) }
      try {
        return { seasons: await provider.getSeasons(externalId, mediaType), error: null }
      } catch (error) {
        const providerError = toProviderError(error)
        return { seasons: [], error: { source, code: providerError.code, message: providerError.message } }
      }
    },

    async getEpisodes(
      source: MetadataSource,
      mediaType: MediaType,
      externalId: string,
      seasonNumber: number
    ): Promise<GetEpisodesResponse> {
      const provider = providerForSource(source)
      if (!provider) return { episodes: [], error: missingConfigError(source) }
      try {
        return { episodes: await provider.getEpisodes(externalId, mediaType, seasonNumber), error: null }
      } catch (error) {
        const providerError = toProviderError(error)
        return { episodes: [], error: { source, code: providerError.code, message: providerError.message } }
      }
    }
  }
}
