import type { NormalizedMedia, ProviderErrorInfo } from '@shared/metadata'
import type { MediaTypeFilter } from '@renderer/hooks/useMediaSearch'

export interface CachedSearch {
  results: NormalizedMedia[]
  errors: ProviderErrorInfo[]
}

/**
 * Session-lifetime cache of completed searches, keyed by exactly what was
 * searched for. Lets returning to the Search page after viewing a title's
 * details (or any other back/forward navigation) show the same results
 * instantly instead of re-querying TMDB/AniList — the provider layer already
 * caches for 5 minutes (see main/metadata/cache.ts), but that still costs an
 * IPC round trip and a loading flash; this avoids both entirely for a search
 * the user has already seen in this session.
 *
 * Deliberately a plain module-level Map, not a new dependency or a
 * general-purpose state library — this is the smallest thing that solves
 * "don't repeat a search we already have the answer to."
 */
const cache = new Map<string, CachedSearch>()

export function searchCacheKey(query: string, typeFilter: MediaTypeFilter): string {
  return `${typeFilter}:${query.trim().toLowerCase()}`
}

export function getCachedSearch(key: string): CachedSearch | undefined {
  return cache.get(key)
}

export function setCachedSearch(key: string, value: CachedSearch): void {
  cache.set(key, value)
}

/** Test-only: reset between test cases so one test's results can't leak into another's. */
export function clearSearchResultsCache(): void {
  cache.clear()
}
