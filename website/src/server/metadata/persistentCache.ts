import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { atomicWrite } from '../files/atomicWrite'
import type { MediaSearchProvider } from './provider'

/** Durable read-through metadata. Explicit refresh never silently returns stale data. */
export function withPersistentCache(provider: MediaSearchProvider, directory: string): MediaSearchProvider {
  function validPayload(key: string, value: unknown): boolean {
    const record = (entry: unknown): entry is Record<string, unknown> => typeof entry === 'object' && entry !== null
    if (key.endsWith(':details')) return record(value) && typeof value.title === 'string' && typeof value.externalId === 'string' && value.source === provider.source && ['movie', 'tv', 'anime'].includes(String(value.mediaType)) && Array.isArray(value.genres)
    const field = key.endsWith(':seasons') ? 'seasonNumber' : 'episodeNumber'
    return Array.isArray(value) && value.every((entry) => record(entry) && typeof entry[field] === 'number' && Number.isInteger(entry[field]))
  }
  async function load<T>(key: string, fetcher: () => Promise<T>, refresh = false): Promise<T> {
    const file = join(directory, `${createHash('sha256').update(`${provider.source}:${key}`).digest('hex')}.json`)
    let saved: { version: number; savedAt: number; data: T } | undefined
    try {
      const candidate = JSON.parse(readFileSync(file, 'utf8'))
      if (candidate?.version === 1 && typeof candidate.savedAt === 'number' && validPayload(key, candidate.data)) saved = candidate
    } catch { /* A missing or damaged cache never blocks a provider request. */ }
    if (!refresh && saved) return saved.data
    try {
      const data = await fetcher()
      try { atomicWrite(file, JSON.stringify({ version: 1, savedAt: Date.now(), data })) }
      catch (error) { console.warn('[metadata] could not save offline metadata', error) }
      return data
    } catch (error) {
      if (!refresh && saved) return saved.data
      throw error
    }
  }
  return {
    source: provider.source,
    supportedTypes: provider.supportedTypes,
    search: (query, type) => provider.search(query, type),
    getDetails: (id, type, refresh) => load(`${type}:${id}:details`, () => provider.getDetails(id, type), refresh),
    getSeasons: (id, type, refresh) => load(`${type}:${id}:seasons`, () => provider.getSeasons(id, type), refresh),
    getEpisodes: (id, type, season, refresh) => load(`${type}:${id}:episodes:${season}`, () => provider.getEpisodes(id, type, season), refresh)
  }
}
