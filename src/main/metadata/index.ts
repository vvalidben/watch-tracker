import { createAniListProvider } from './anilistProvider'
import { withCache } from './cache'
import { withRateLimit } from './rateLimit'
import { createMediaSearchService, type MediaSearchService } from './searchService'
import { createTmdbProvider } from './tmdbProvider'
import type { MediaSearchProvider } from './provider'

const TMDB_MIN_INTERVAL_MS = 250
const ANILIST_MIN_INTERVAL_MS = 700
const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000

/** `configuredApiKey` (from Settings) always wins over the TMDB_API_KEY env var when both are present. */
export function createMetadataService(configuredApiKey?: string | null): MediaSearchService {
  const providers: MediaSearchProvider[] = []

  const tmdbApiKey = configuredApiKey || process.env.TMDB_API_KEY
  if (tmdbApiKey) {
    const tmdb = createTmdbProvider({
      apiKey: tmdbApiKey,
      apiBaseUrl: process.env.TMDB_API_BASE_URL,
      imageBaseUrl: process.env.TMDB_IMAGE_BASE_URL
    })
    providers.push(withCache(withRateLimit(tmdb, TMDB_MIN_INTERVAL_MS), SEARCH_CACHE_TTL_MS))
  } else {
    console.warn('[metadata] TMDB_API_KEY is not set — movie/TV search is disabled. See .env.example.')
  }

  const anilist = createAniListProvider({ apiUrl: process.env.ANILIST_API_URL })
  providers.push(withCache(withRateLimit(anilist, ANILIST_MIN_INTERVAL_MS), SEARCH_CACHE_TTL_MS))

  return createMediaSearchService(providers)
}

export type { MediaSearchService } from './searchService'
