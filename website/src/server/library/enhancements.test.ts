import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestContext } from '../db/testUtils'
import type { MediaSearchService } from '../metadata'
import type { NormalizedMedia } from '@shared/metadata'
import { getOrCreateMediaItem } from './ensureLocalMedia'
import { refreshMetadata, saveEpisodeMetadata, saveSeasonMetadata } from './refreshMetadata'
import { editWatchDate, logWatch, startRewatch } from './rewatch'
import { listUpcomingEpisodes } from './upcoming'
import { applyCsvImport, previewCsvImport } from './csvImport'
import { withLocalMetadata } from '../metadata/localMetadata'

let ctx: Awaited<ReturnType<typeof createTestContext>>
const identity = { source: 'tmdb' as const, mediaType: 'tv' as const, externalId: '42' }
const media: NormalizedMedia = { ...identity, title: 'Old name', originalTitle: null, description: 'Old synopsis', poster: null, backdrop: null,
  releaseDate: null, status: 'airing', genres: [], rating: null, numberOfSeasons: 1, numberOfEpisodes: 2 }
function service(): MediaSearchService {
  return { search: vi.fn().mockResolvedValue({ results: [], errors: [] }),
    getDetails: vi.fn().mockResolvedValue({ result: { ...media, title: 'Fresh name', numberOfEpisodes: 3 }, error: null }),
    getSeasons: vi.fn().mockResolvedValue({ seasons: [{ seasonNumber: 1, title: 'Season one', episodeCount: 3 }], error: null }),
    getEpisodes: vi.fn().mockResolvedValue({ episodes: [{ episodeNumber: 1, title: 'Pilot', overview: null, airDate: '2025-01-01', runtimeMinutes: 40 },
      { episodeNumber: 2, title: 'Next', overview: null, airDate: '2025-01-02', runtimeMinutes: 42 },
      { episodeNumber: 3, title: 'Future', overview: null, airDate: '2027-01-01', runtimeMinutes: 42 }], error: null }) }
}
async function tracked(input = media) {
  const item = await getOrCreateMediaItem(ctx.repositories, input)
  const entry = await ctx.repositories.libraryEntries.add({ mediaItemId: item.id, rating: 8.5, notes: 'Keep me', favorite: true })
  return { item, entry }
}
beforeEach(async () => { ctx = await createTestContext() })
afterEach(() => { ctx.close() })

describe('metadata refresh and offline schedules', () => {
  it('uses the SQLite metadata copy without a network call after cache files are absent', async () => {
    await tracked()
    await refreshMetadata(ctx.repositories, service(), identity)
    const api = service()
    vi.mocked(api.getSeasons).mockRejectedValue(new Error('offline'))
    vi.mocked(api.getEpisodes).mockRejectedValue(new Error('offline'))
    const offline = withLocalMetadata(api, ctx.repositories)
    expect((await offline.getSeasons('tmdb', 'tv', '42')).seasons[0].episodeCount).toBe(3)
    expect((await offline.getEpisodes('tmdb', 'tv', '42', 1)).episodes).toHaveLength(3)
    expect(api.getSeasons).not.toHaveBeenCalled(); expect(api.getEpisodes).not.toHaveBeenCalled()
    await expect(offline.getSeasons('tmdb', 'tv', '42', true)).rejects.toThrow('offline')
  })
  it('refreshes metadata without replacing local IDs or personal data', async () => {
    const { item, entry } = await tracked()
    const season = await ctx.repositories.seasons.create({ mediaItemId: item.id, seasonNumber: 1 })
    const episode = await ctx.repositories.episodes.create({ seasonId: season.id, episodeNumber: 1 })
    await ctx.repositories.episodeProgress.markWatched(episode.id, '2025-01-01T12:00:00Z')
    await ctx.repositories.episodeProgress.rate(episode.id, 9)
    await ctx.repositories.episodeProgress.setNotes(episode.id, 'Episode note')
    await ctx.repositories.seasonRatings.rate(season.id, 7.5)
    const tag = await ctx.repositories.tags.create('Keep')
    await ctx.repositories.tags.attachToMediaItem(item.id, tag.id)
    const result = await refreshMetadata(ctx.repositories, service(), identity)
    expect(result.episodesCached).toBe(3)
    expect(await ctx.repositories.mediaItems.getById(item.id)).toMatchObject({ title: 'Fresh name', numberOfEpisodes: 3 })
    expect(await ctx.repositories.libraryEntries.getById(entry.id)).toMatchObject({ rating: 8.5, notes: 'Keep me', favorite: true })
    expect(await ctx.repositories.episodes.getBySeasonAndNumber(season.id, 1)).toMatchObject({ id: episode.id, title: 'Pilot' })
    expect(await ctx.repositories.episodeProgress.getByEpisodeId(episode.id)).toMatchObject({ watched: true, rating: 9, notes: 'Episode note' })
    expect(await ctx.repositories.seasonRatings.getBySeasonId(season.id)).toMatchObject({ rating: 7.5 })
    expect(await ctx.repositories.tags.listForMediaItem(item.id)).toHaveLength(1)
  })
  it('keeps a failed season refresh from erasing saved episode metadata', async () => {
    const { item } = await tracked()
    const api = service()
    await refreshMetadata(ctx.repositories, api, identity)
    vi.mocked(api.getEpisodes).mockResolvedValue({ episodes: [], error: { source: 'tmdb', code: 'network', message: 'offline' } })
    const result = await refreshMetadata(ctx.repositories, api, identity)
    expect(result.warnings).toEqual(['Season 1: offline'])
    const [season] = await ctx.repositories.seasons.listByMediaItem(item.id)
    expect(await ctx.repositories.episodes.listBySeason(season.id)).toHaveLength(3)
  })
  it('lists unwatched air dates locally, excluding watched episodes, specials, and paused shows', async () => {
    const { item, entry } = await tracked()
    await refreshMetadata(ctx.repositories, service(), identity)
    const [season] = await ctx.repositories.seasons.listByMediaItem(item.id)
    const [episode] = await ctx.repositories.episodes.listBySeason(season.id)
    await ctx.repositories.episodeProgress.markWatched(episode.id)
    await saveSeasonMetadata(ctx.repositories, identity, [{ seasonNumber: 0, title: null, overview: null, poster: null, airDate: null, episodeCount: 1 }])
    await saveEpisodeMetadata(ctx.repositories, identity, 0, [{ episodeNumber: 1, title: null, overview: null, airDate: '2025-01-01', runtimeMinutes: null }])
    const result = await listUpcomingEpisodes(ctx.repositories, new Date('2026-01-01T12:00:00'))
    expect(result.map((value) => [value.episodeNumber, value.available])).toEqual([[2, true], [3, false]])
    await ctx.repositories.libraryEntries.updateStatus(entry.id, 'on_hold')
    expect(await listUpcomingEpisodes(ctx.repositories)).toEqual([])
  })
})

describe('rewatches and editable dates', () => {
  it('resets episode flags for a rewatch without deleting history, ratings or notes', async () => {
    const { item, entry } = await tracked()
    await logWatch(ctx.repositories, service(), { ...identity, seasonNumber: 1, episodeNumber: 1, watchedAt: '2025-01-10T10:00:00Z' })
    const [season] = await ctx.repositories.seasons.listByMediaItem(item.id)
    const [episode] = await ctx.repositories.episodes.listBySeason(season.id)
    await ctx.repositories.episodeProgress.rate(episode.id, 9)
    await startRewatch(ctx.repositories, identity)
    expect(await ctx.repositories.episodeProgress.getByEpisodeId(episode.id)).toMatchObject({ watched: false, rating: 9 })
    expect(await ctx.repositories.watchEvents.countForEpisode(episode.id)).toBe(1)
    expect(await ctx.repositories.libraryEntries.getById(entry.id)).toMatchObject({ watchStatus: 'watching', notes: 'Keep me' })
  })
  it('logs repeated movie watches and keeps the latest date when backdating another watch', async () => {
    const movie = { ...media, mediaType: 'movie' as const }
    const { item, entry } = await tracked(movie)
    await logWatch(ctx.repositories, service(), { ...identity, mediaType: 'movie', watchedAt: '2025-02-01T12:00:00Z' })
    await logWatch(ctx.repositories, service(), { ...identity, mediaType: 'movie', watchedAt: '2025-01-01T12:00:00Z' })
    expect(await ctx.repositories.libraryEntries.getById(entry.id)).toMatchObject({ completedAt: '2025-02-01T12:00:00.000Z', rewatchCount: 1 })
    const events = await ctx.repositories.watchEvents.listForMovie(item.id)
    await editWatchDate(ctx.repositories, { eventId: events[1].id, watchedAt: '2024-01-01T12:00:00Z' })
    expect(await ctx.repositories.libraryEntries.getById(entry.id)).toMatchObject({ completedAt: '2025-01-01T12:00:00.000Z', rewatchCount: 1 })
  })
  it('editing an unwatched episode date preserves its unwatched flag', async () => {
    const { item } = await tracked()
    await logWatch(ctx.repositories, service(), { ...identity, seasonNumber: 1, episodeNumber: 1, watchedAt: '2025-01-10T10:00:00Z' })
    const [season] = await ctx.repositories.seasons.listByMediaItem(item.id)
    const [episode] = await ctx.repositories.episodes.listBySeason(season.id)
    await ctx.repositories.episodeProgress.markUnwatched(episode.id)
    const [event] = await ctx.repositories.watchEvents.listForEpisode(episode.id)
    await editWatchDate(ctx.repositories, { eventId: event.id, watchedAt: '2025-01-11T10:00:00Z' })
    expect(await ctx.repositories.episodeProgress.getByEpisodeId(episode.id)).toMatchObject({ watched: false, watchedAt: '2025-01-11T10:00:00.000Z' })
  })
  it('rejects invalid/future dates before creating personal records', async () => {
    const { item } = await tracked()
    await expect(logWatch(ctx.repositories, service(), { ...identity, watchedAt: '2999-01-01', seasonNumber: 1, episodeNumber: 1 })).rejects.toThrow('future')
    expect(await ctx.repositories.seasons.listByMediaItem(item.id)).toEqual([])
  })
})

describe('identity and CSV merging', () => {
  it('keeps a film and series with the same TMDB ID separate', async () => {
    const tv = await getOrCreateMediaItem(ctx.repositories, media)
    const film = await getOrCreateMediaItem(ctx.repositories, { ...media, mediaType: 'movie', title: 'A different film' })
    expect(tv.id).not.toBe(film.id)
    expect((await ctx.repositories.mediaItems.findBySource('tmdb', '42', 'movie'))?.id).toBe(film.id)
    await expect(ctx.repositories.mediaItems.findBySource('tmdb', '42')).rejects.toThrow('Media type')
  })
  it('previews duplicates within the file and skips them when requested', async () => {
    const data = await previewCsvImport(ctx.repositories, 'title,source,media_type,external_id\nA,tmdb,movie,1\nA again,tmdb,movie,1\nB,tmdb,tv,1', 'test.csv')
    expect(data.preview.rows.map((row) => row.duplicate)).toEqual([false, true, false])
    expect(await applyCsvImport(ctx.repositories, data.preview, data.fields, 'skip')).toMatchObject({ imported: 2, skipped: 1, errors: [] })
    expect(await ctx.repositories.libraryEntries.list()).toHaveLength(2)
  })
  it('merges supplied personal columns while preserving omitted fields and history', async () => {
    const { item, entry } = await tracked({ ...media, mediaType: 'movie' })
    await ctx.repositories.watchEvents.record(item.id, null, '2025-01-01T12:00:00.000Z')
    const data = await previewCsvImport(ctx.repositories, 'title,source,media_type,external_id,rating\nA,tmdb,movie,42,9', 'test.csv')
    expect(data.preview.rows[0].duplicate).toBe(true)
    expect(await applyCsvImport(ctx.repositories, data.preview, data.fields, 'merge')).toMatchObject({ merged: 1 })
    expect(await ctx.repositories.libraryEntries.getById(entry.id)).toMatchObject({ rating: 9, notes: 'Keep me', favorite: true })
    expect(await ctx.repositories.watchEvents.countForMovie(item.id)).toBe(1)
  })
  it('reimporting the same watch date does not create another watch', async () => {
    const data = await previewCsvImport(ctx.repositories, 'title,source,media_type,external_id,watched_at\nA,tmdb,movie,42,2025-01-01T12:00:00Z', 'test.csv')
    await applyCsvImport(ctx.repositories, data.preview, data.fields, 'merge')
    await applyCsvImport(ctx.repositories, data.preview, data.fields, 'merge')
    const item = await ctx.repositories.mediaItems.findBySource('tmdb', '42', 'movie')
    expect(await ctx.repositories.watchEvents.countForMovie(item!.id)).toBe(1)
  })
})
