import type { MediaSearchProvider } from './provider'

/**
 * Wraps a provider so its calls are serialized with a minimum gap between
 * them, regardless of how many searches fire in quick succession (e.g. fast
 * typing before the debounce settles, or several tabs hitting the same
 * provider). This is proactive spacing; httpClient.ts separately handles a
 * 429 that gets through anyway by backing off and retrying.
 */
export function withRateLimit(provider: MediaSearchProvider, minIntervalMs: number): MediaSearchProvider {
  let chain: Promise<unknown> = Promise.resolve()
  let lastCallAt = 0

  function schedule<T>(run: () => Promise<T>): Promise<T> {
    const scheduled = chain.then(async () => {
      const wait = lastCallAt + minIntervalMs - Date.now()
      if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait))
      lastCallAt = Date.now()
      return run()
    })
    // Keep the chain alive even if this call fails, so later calls aren't stuck.
    chain = scheduled.catch(() => undefined)
    return scheduled
  }

  return {
    source: provider.source,
    supportedTypes: provider.supportedTypes,
    search: (query, type) => schedule(() => provider.search(query, type)),
    getDetails: (externalId, type) => schedule(() => provider.getDetails(externalId, type)),
    getSeasons: (externalId, type) => schedule(() => provider.getSeasons(externalId, type)),
    getEpisodes: (externalId, type, seasonNumber) =>
      schedule(() => provider.getEpisodes(externalId, type, seasonNumber))
  }
}
