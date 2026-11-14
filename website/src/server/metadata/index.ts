import { createAniListProvider } from './anilistProvider'
import { createTmdbProvider } from './tmdbProvider'
import { createMediaSearchService } from './searchService'
import { withCache } from './cache'
import { withRateLimit } from './rateLimit'
import { ProviderError } from './errors'
import type { MediaSearchProvider } from './provider'
export type { MediaSearchService } from './searchService'
export function createMetadataService(apiKey?: string | null) {
  const missing = async (): Promise<never> => { throw new ProviderError('missing_config','Add a TMDB API key in Settings to search films and series. Anime search is already available.') }
  const tmdb: MediaSearchProvider = apiKey ? createTmdbProvider({apiKey}) : {source:'tmdb',supportedTypes:['movie','tv'],search:missing,getDetails:missing,getSeasons:missing,getEpisodes:missing}
  return createMediaSearchService([withCache(withRateLimit(tmdb,250),300000),withCache(withRateLimit(createAniListProvider({}),700),300000)])
}
