import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTestContext } from '../testUtils'
import type { Repositories } from './index'
import type { OpenedDatabase } from '../client'
import type { Episode, MediaItem } from '../types'

let ctx: OpenedDatabase & { repositories: Repositories }
let show: MediaItem
let episode: Episode

beforeEach(async () => {
  ctx = await createTestContext()
  show = await ctx.repositories.mediaItems.create({ type: 'anime', title: 'Test Anime', source: 'manual' })
  const season = await ctx.repositories.seasons.create({ mediaItemId: show.id, seasonNumber: 1 })
  episode = await ctx.repositories.episodes.create({ seasonId: season.id, episodeNumber: 5 })
})

afterEach(() => {
  ctx.close()
})

describe('watchEvents repository', () => {
  it('records an episode watch event', async () => {
    const event = await ctx.repositories.watchEvents.record(show.id, episode.id, '2026-01-10T00:00:00.000Z')

    expect(event.mediaItemId).toBe(show.id)
    expect(event.episodeId).toBe(episode.id)
    expect(event.watchedAt).toBe('2026-01-10T00:00:00.000Z')
  })

  it('records a movie watch event with a null episodeId', async () => {
    const movie = await ctx.repositories.mediaItems.create({ type: 'movie', title: 'A Movie', source: 'manual' })

    const event = await ctx.repositories.watchEvents.record(movie.id, null, '2026-01-10T00:00:00.000Z')

    expect(event.episodeId).toBeNull()
  })

  it('preserves every date an episode was watched, in order — the "Episode 5" example', async () => {
    await ctx.repositories.watchEvents.record(show.id, episode.id, '2026-01-10T00:00:00.000Z')
    await ctx.repositories.watchEvents.record(show.id, episode.id, '2026-06-12T00:00:00.000Z')

    const history = await ctx.repositories.watchEvents.listForEpisode(episode.id)

    expect(history.map((event) => event.watchedAt)).toEqual([
      '2026-01-10T00:00:00.000Z',
      '2026-06-12T00:00:00.000Z'
    ])
  })

  it('counts how many times an episode has been watched', async () => {
    expect(await ctx.repositories.watchEvents.countForEpisode(episode.id)).toBe(0)

    await ctx.repositories.watchEvents.record(show.id, episode.id, '2026-01-10T00:00:00.000Z')
    await ctx.repositories.watchEvents.record(show.id, episode.id, '2026-06-12T00:00:00.000Z')

    expect(await ctx.repositories.watchEvents.countForEpisode(episode.id)).toBe(2)
  })

  it('keeps movie history separate from episode history for the same media item', async () => {
    // A tv/anime media item never gets a movie-level (episodeId: null) event
    // in practice, but the query itself must still isolate the two kinds.
    await ctx.repositories.watchEvents.record(show.id, episode.id, '2026-01-10T00:00:00.000Z')
    await ctx.repositories.watchEvents.record(show.id, null, '2026-02-01T00:00:00.000Z')

    expect(await ctx.repositories.watchEvents.listForMovie(show.id)).toHaveLength(1)
    expect(await ctx.repositories.watchEvents.listForEpisode(episode.id)).toHaveLength(1)
  })

  describe('recordMany', () => {
    it('records one event per episode id, all at the same timestamp', async () => {
      const season = await ctx.repositories.seasons.getById(episode.seasonId)
      const episode2 = await ctx.repositories.episodes.create({ seasonId: season!.id, episodeNumber: 6 })

      await ctx.repositories.watchEvents.recordMany(show.id, [episode.id, episode2.id], '2026-03-01T00:00:00.000Z')

      expect(await ctx.repositories.watchEvents.countForEpisode(episode.id)).toBe(1)
      expect(await ctx.repositories.watchEvents.countForEpisode(episode2.id)).toBe(1)
    })

    it('does nothing for an empty list', async () => {
      await expect(ctx.repositories.watchEvents.recordMany(show.id, [], '2026-03-01T00:00:00.000Z')).resolves.toBeUndefined()
    })
  })

  describe('getWatchCountsByEpisodeIds', () => {
    it('returns an empty map for an empty input', async () => {
      expect((await ctx.repositories.watchEvents.getWatchCountsByEpisodeIds([])).size).toBe(0)
    })

    it('bulk-counts watches per episode, omitting episodes never watched', async () => {
      const season = await ctx.repositories.seasons.getById(episode.seasonId)
      const episode2 = await ctx.repositories.episodes.create({ seasonId: season!.id, episodeNumber: 6 })
      await ctx.repositories.watchEvents.record(show.id, episode.id, '2026-01-10T00:00:00.000Z')
      await ctx.repositories.watchEvents.record(show.id, episode.id, '2026-06-12T00:00:00.000Z')

      const counts = await ctx.repositories.watchEvents.getWatchCountsByEpisodeIds([episode.id, episode2.id])

      expect(counts.get(episode.id)).toBe(2)
      expect(counts.has(episode2.id)).toBe(false)
    })
  })

  describe('getLastWatchedByMediaItemIds', () => {
    it('returns the most recent watch across movie and episode events for each media item', async () => {
      const movie = await ctx.repositories.mediaItems.create({ type: 'movie', title: 'A Movie', source: 'manual' })
      await ctx.repositories.watchEvents.record(show.id, episode.id, '2026-01-10T00:00:00.000Z')
      await ctx.repositories.watchEvents.record(show.id, episode.id, '2026-06-12T00:00:00.000Z')
      await ctx.repositories.watchEvents.record(movie.id, null, '2026-03-01T00:00:00.000Z')

      const lastWatched = await ctx.repositories.watchEvents.getLastWatchedByMediaItemIds([show.id, movie.id])

      expect(lastWatched.get(show.id)).toBe('2026-06-12T00:00:00.000Z')
      expect(lastWatched.get(movie.id)).toBe('2026-03-01T00:00:00.000Z')
    })
  })

  describe('listRecentForMediaItems', () => {
    it('returns events newest first, capped at the given limit', async () => {
      await ctx.repositories.watchEvents.record(show.id, episode.id, '2026-01-10T00:00:00.000Z')
      await ctx.repositories.watchEvents.record(show.id, episode.id, '2026-06-12T00:00:00.000Z')
      await ctx.repositories.watchEvents.record(show.id, episode.id, '2026-03-01T00:00:00.000Z')

      const recent = await ctx.repositories.watchEvents.listRecentForMediaItems([show.id], 2)

      expect(recent.map((event) => event.watchedAt)).toEqual([
        '2026-06-12T00:00:00.000Z',
        '2026-03-01T00:00:00.000Z'
      ])
    })
  })
})
