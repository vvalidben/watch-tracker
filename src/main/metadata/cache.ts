import type { MediaType, NormalizedEpisode, NormalizedMedia, NormalizedSeason } from '@shared/metadata'
import type { MediaSearchProvider } from './provider'

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

/**
 * One entry's worth of "cache + de-dupe concurrent fetches" behavior,
 * reused for each of the four cached operations below. Storing the
 * in-flight *promise* (not just the eventually-resolved value) is what
 * prevents two near-simultaneous callers for the same key — e.g. a
 * MediaDetail page's progress summary and its episode list both asking for
 * the same season's episodes on first load — from firing two identical
 * network requests before either has a chance to populate the value cache.
 */
function createEntryCache<T>(ttlMs: number) {
  const cache = new Map<string, CacheEntry<T>>()
  const inFlight = new Map<string, Promise<T>>()

  return function getOrFetch(key: string, fetcher: () => Promise<T>): Promise<T> {
    const cached = cache.get(key)
    if (cached && cached.expiresAt > Date.now()) return Promise.resolve(cached.value)

    const pending = inFlight.get(key)
    if (pending) return pending

    const promise = fetcher()
      .then((value) => {
        cache.set(key, { value, expiresAt: Date.now() + ttlMs })
        return value
      })
      .finally(() => {
        inFlight.delete(key)
      })
    inFlight.set(key, promise)
    return promise
  }
}

/**
 * In-memory TTL cache in front of a provider. Deliberately not persisted to
 * disk: it exists to avoid redundant network calls within one running
 * session (repeated searches, revisiting a detail page), not to work
 * offline — losing it on restart is fine.
 */
export function withCache(provider: MediaSearchProvider, ttlMs = 5 * 60 * 1000): MediaSearchProvider {
  const search = createEntryCache<NormalizedMedia[]>(ttlMs)
  const details = createEntryCache<NormalizedMedia>(ttlMs)
  const seasons = createEntryCache<NormalizedSeason[]>(ttlMs)
  const episodes = createEntryCache<NormalizedEpisode[]>(ttlMs)

  return {
    source: provider.source,
    supportedTypes: provider.supportedTypes,

    search(query: string, type: MediaType) {
      const key = `${type}:${query.trim().toLowerCase()}`
      return search(key, () => provider.search(query, type))
    },

    getDetails(externalId: string, type: MediaType) {
      const key = `${type}:${externalId}`
      return details(key, () => provider.getDetails(externalId, type))
    },

    getSeasons(externalId: string, type: MediaType) {
      const key = `${type}:${externalId}`
      return seasons(key, () => provider.getSeasons(externalId, type))
    },

    getEpisodes(externalId: string, type: MediaType, seasonNumber: number) {
      const key = `${type}:${externalId}:${seasonNumber}`
      return episodes(key, () => provider.getEpisodes(externalId, type, seasonNumber))
    }
  }
}
