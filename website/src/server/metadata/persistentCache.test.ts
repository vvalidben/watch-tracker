import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MediaSearchProvider } from './provider'
import { withPersistentCache } from './persistentCache'

let directory: string
beforeEach(() => { directory = mkdtempSync(join(tmpdir(), 'watch-tracker-cache-test-')) })
afterEach(() => { rmSync(directory, { recursive: true, force: true }) })
function provider(): MediaSearchProvider {
  return { source: 'tmdb', supportedTypes: ['tv'], search: vi.fn().mockResolvedValue([]),
    getDetails: vi.fn(), getSeasons: vi.fn().mockResolvedValue([{ seasonNumber: 1, episodeCount: 2 }]),
    getEpisodes: vi.fn().mockResolvedValue([{ episodeNumber: 1, title: 'Pilot', airDate: '2025-01-01' }]) }
}
describe('persistent offline metadata', () => {
  it('survives provider recreation and serves episodes without a network call', async () => {
    const first = withPersistentCache(provider(), directory)
    const expected = await first.getEpisodes('1', 'tv', 1)
    const offline = provider()
    vi.mocked(offline.getEpisodes).mockRejectedValue(new Error('offline'))
    expect(await withPersistentCache(offline, directory).getEpisodes('1', 'tv', 1)).toEqual(expected)
    expect(offline.getEpisodes).not.toHaveBeenCalled()
  })
  it('force refresh updates cached metadata, and a failed refresh keeps the old copy', async () => {
    const raw = provider(), cached = withPersistentCache(raw, directory)
    await cached.getEpisodes('1', 'tv', 1)
    vi.mocked(raw.getEpisodes).mockResolvedValue([{ episodeNumber: 2, title: 'New', overview: null, airDate: null, runtimeMinutes: null }])
    expect((await cached.getEpisodes('1', 'tv', 1, true))[0].episodeNumber).toBe(2)
    vi.mocked(raw.getEpisodes).mockRejectedValue(new Error('offline'))
    await expect(cached.getEpisodes('1', 'tv', 1, true)).rejects.toThrow('offline')
    expect((await cached.getEpisodes('1', 'tv', 1))[0].episodeNumber).toBe(2)
  })
  it('keeps empty seasons cached and separates title, type and season keys', async () => {
    const raw = provider(), cached = withPersistentCache(raw, directory)
    vi.mocked(raw.getEpisodes).mockResolvedValue([])
    await cached.getEpisodes('1', 'tv', 1); await cached.getEpisodes('1', 'tv', 1)
    await cached.getEpisodes('1', 'anime', 1); await cached.getEpisodes('1', 'tv', 2)
    expect(raw.getEpisodes).toHaveBeenCalledTimes(3)
  })
  it('ignores damaged cache files and refetches', async () => {
    const raw = provider(), cached = withPersistentCache(raw, directory)
    await cached.getSeasons('1', 'tv')
    writeFileSync(join(directory, readdirSync(directory)[0]), 'broken json')
    await cached.getSeasons('1', 'tv')
    expect(raw.getSeasons).toHaveBeenCalledTimes(2)
  })
})
