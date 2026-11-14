import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTestContext } from '../testUtils'
import type { Repositories } from './index'
import type { OpenedDatabase } from '../client'
import type { Episode } from '../types'
import { InvalidRatingError } from '../validation'

let ctx: OpenedDatabase & { repositories: Repositories }
let episode: Episode

beforeEach(async () => {
  ctx = await createTestContext()
  const show = await ctx.repositories.mediaItems.create({
    type: 'anime',
    title: 'Test Anime',
    source: 'manual'
  })
  const season = await ctx.repositories.seasons.create({ mediaItemId: show.id, seasonNumber: 1 })
  episode = await ctx.repositories.episodes.create({ seasonId: season.id, episodeNumber: 1 })
})

afterEach(() => {
  ctx.close()
})

describe('episodeProgress repository', () => {
  it('has no progress row until the episode is interacted with', async () => {
    expect(await ctx.repositories.episodeProgress.getByEpisodeId(episode.id)).toBeUndefined()
  })

  it('marks an episode watched, creating the progress row lazily', async () => {
    const progress = await ctx.repositories.episodeProgress.markWatched(episode.id)

    expect(progress.watched).toBe(true)
    expect(progress.watchedAt).toBeTruthy()
  })

  it('marks an episode unwatched again, preserving watchedAt as history', async () => {
    const watched = await ctx.repositories.episodeProgress.markWatched(episode.id)
    const progress = await ctx.repositories.episodeProgress.markUnwatched(episode.id)

    expect(progress.watched).toBe(false)
    expect(progress.watchedAt).toBe(watched.watchedAt)
  })

  it('unwatching a never-watched episode leaves watchedAt null', async () => {
    const progress = await ctx.repositories.episodeProgress.markUnwatched(episode.id)

    expect(progress.watched).toBe(false)
    expect(progress.watchedAt).toBeNull()
  })

  it('rates an episode independently of its watched state', async () => {
    const progress = await ctx.repositories.episodeProgress.rate(episode.id, 9)
    expect(progress.rating).toBe(9)
    expect(progress.watched).toBe(false)
  })

  it('rejects an invalid episode rating', async () => {
    await expect(ctx.repositories.episodeProgress.rate(episode.id, 11)).rejects.toThrow(
      InvalidRatingError
    )
  })

  it('stores notes without disturbing the watched flag or rating', async () => {
    await ctx.repositories.episodeProgress.markWatched(episode.id)
    await ctx.repositories.episodeProgress.rate(episode.id, 7.5)

    const progress = await ctx.repositories.episodeProgress.setNotes(episode.id, 'Great twist.')

    expect(progress.notes).toBe('Great twist.')
    expect(progress.watched).toBe(true)
    expect(progress.rating).toBe(7.5)
  })

  it('edits and deletes an episode note without disturbing the watched flag', async () => {
    await ctx.repositories.episodeProgress.markWatched(episode.id)
    await ctx.repositories.episodeProgress.setNotes(episode.id, 'First draft.')

    const edited = await ctx.repositories.episodeProgress.setNotes(episode.id, 'Edited note.')
    expect(edited.notes).toBe('Edited note.')

    const deleted = await ctx.repositories.episodeProgress.setNotes(episode.id, null)
    expect(deleted.notes).toBeNull()
    expect(deleted.watched).toBe(true)
  })

  it('only ever has one progress row per episode (upsert, not insert)', async () => {
    await ctx.repositories.episodeProgress.markWatched(episode.id)
    await ctx.repositories.episodeProgress.rate(episode.id, 6)
    await ctx.repositories.episodeProgress.setNotes(episode.id, 'note')

    const progress = await ctx.repositories.episodeProgress.getByEpisodeId(episode.id)
    expect(progress?.watched).toBe(true)
    expect(progress?.rating).toBe(6)
    expect(progress?.notes).toBe('note')
  })

  describe('setManyWatched', () => {
    it('marks every given episode watched in one call', async () => {
      const season = await ctx.repositories.seasons.getById(episode.seasonId)
      const episode2 = await ctx.repositories.episodes.create({ seasonId: season!.id, episodeNumber: 2 })
      const episode3 = await ctx.repositories.episodes.create({ seasonId: season!.id, episodeNumber: 3 })

      await ctx.repositories.episodeProgress.setManyWatched([episode.id, episode2.id, episode3.id], true)

      const progress1 = await ctx.repositories.episodeProgress.getByEpisodeId(episode.id)
      const progress2 = await ctx.repositories.episodeProgress.getByEpisodeId(episode2.id)
      const progress3 = await ctx.repositories.episodeProgress.getByEpisodeId(episode3.id)
      expect(progress1?.watched).toBe(true)
      expect(progress2?.watched).toBe(true)
      expect(progress3?.watched).toBe(true)
      expect(progress1?.watchedAt).toBeTruthy()
    })

    it('unmarks every given episode, preserving watchedAt as history', async () => {
      const watched = await ctx.repositories.episodeProgress.markWatched(episode.id)

      await ctx.repositories.episodeProgress.setManyWatched([episode.id], false)

      const progress = await ctx.repositories.episodeProgress.getByEpisodeId(episode.id)
      expect(progress?.watched).toBe(false)
      expect(progress?.watchedAt).toBe(watched.watchedAt)
    })

    it('bulk-unwatching a never-watched episode leaves watchedAt null', async () => {
      await ctx.repositories.episodeProgress.setManyWatched([episode.id], false)

      const progress = await ctx.repositories.episodeProgress.getByEpisodeId(episode.id)
      expect(progress?.watched).toBe(false)
      expect(progress?.watchedAt).toBeNull()
    })

    it('preserves an existing rating when bulk-marking watched (upsert, not overwrite)', async () => {
      await ctx.repositories.episodeProgress.rate(episode.id, 8.5)

      await ctx.repositories.episodeProgress.setManyWatched([episode.id], true)

      const progress = await ctx.repositories.episodeProgress.getByEpisodeId(episode.id)
      expect(progress?.watched).toBe(true)
      expect(progress?.rating).toBe(8.5)
    })

    it('does nothing for an empty list', async () => {
      await expect(ctx.repositories.episodeProgress.setManyWatched([], true)).resolves.toBeUndefined()
    })
  })

  describe('getWatchedSummaryByMediaItemIds', () => {
    it('returns an empty map for an empty input', async () => {
      const summary = await ctx.repositories.episodeProgress.getWatchedSummaryByMediaItemIds([])
      expect(summary.size).toBe(0)
    })

    it('counts watched episodes per media item, ignoring unwatched ones', async () => {
      const showA = await ctx.repositories.mediaItems.create({ type: 'tv', title: 'Show A', source: 'manual' })
      const seasonA = await ctx.repositories.seasons.create({ mediaItemId: showA.id, seasonNumber: 1 })
      const a1 = await ctx.repositories.episodes.create({ seasonId: seasonA.id, episodeNumber: 1 })
      const a2 = await ctx.repositories.episodes.create({ seasonId: seasonA.id, episodeNumber: 2 })
      await ctx.repositories.episodes.create({ seasonId: seasonA.id, episodeNumber: 3 }) // left unwatched
      await ctx.repositories.episodeProgress.markWatched(a1.id)
      await ctx.repositories.episodeProgress.markWatched(a2.id)

      const summary = await ctx.repositories.episodeProgress.getWatchedSummaryByMediaItemIds([showA.id])

      expect(summary.get(showA.id)?.watchedCount).toBe(2)
      expect(summary.get(showA.id)?.lastWatchedAt).toBeTruthy()
    })

    it('aggregates watched episodes across multiple seasons of the same media item', async () => {
      const show = await ctx.repositories.mediaItems.create({ type: 'anime', title: 'Multi-Season', source: 'manual' })
      const s1 = await ctx.repositories.seasons.create({ mediaItemId: show.id, seasonNumber: 1 })
      const s2 = await ctx.repositories.seasons.create({ mediaItemId: show.id, seasonNumber: 2 })
      const e1 = await ctx.repositories.episodes.create({ seasonId: s1.id, episodeNumber: 1 })
      const e2 = await ctx.repositories.episodes.create({ seasonId: s2.id, episodeNumber: 1 })
      await ctx.repositories.episodeProgress.markWatched(e1.id)
      await ctx.repositories.episodeProgress.markWatched(e2.id)

      const summary = await ctx.repositories.episodeProgress.getWatchedSummaryByMediaItemIds([show.id])

      expect(summary.get(show.id)?.watchedCount).toBe(2)
    })

    it('keeps different media items separate and omits items with no watched episodes', async () => {
      const showA = await ctx.repositories.mediaItems.create({ type: 'tv', title: 'Show A', source: 'manual' })
      const showB = await ctx.repositories.mediaItems.create({ type: 'tv', title: 'Show B', source: 'manual' })
      const seasonA = await ctx.repositories.seasons.create({ mediaItemId: showA.id, seasonNumber: 1 })
      const seasonB = await ctx.repositories.seasons.create({ mediaItemId: showB.id, seasonNumber: 1 })
      const a1 = await ctx.repositories.episodes.create({ seasonId: seasonA.id, episodeNumber: 1 })
      await ctx.repositories.episodes.create({ seasonId: seasonB.id, episodeNumber: 1 }) // never watched
      await ctx.repositories.episodeProgress.markWatched(a1.id)

      const summary = await ctx.repositories.episodeProgress.getWatchedSummaryByMediaItemIds([showA.id, showB.id])

      expect(summary.get(showA.id)?.watchedCount).toBe(1)
      expect(summary.has(showB.id)).toBe(false)
    })
  })

  describe('getWatchedCountsBySeasonNumber', () => {
    it('returns an empty map for a title with no watched episodes', async () => {
      const show = await ctx.repositories.mediaItems.create({ type: 'tv', title: 'Show', source: 'manual' })
      const counts = await ctx.repositories.episodeProgress.getWatchedCountsBySeasonNumber(show.id)
      expect(counts.size).toBe(0)
    })

    it('counts watched episodes per season, in one query, for a multi-season title', async () => {
      const show = await ctx.repositories.mediaItems.create({ type: 'tv', title: 'Show', source: 'manual' })
      const s1 = await ctx.repositories.seasons.create({ mediaItemId: show.id, seasonNumber: 1 })
      const s2 = await ctx.repositories.seasons.create({ mediaItemId: show.id, seasonNumber: 2 })
      const e1 = await ctx.repositories.episodes.create({ seasonId: s1.id, episodeNumber: 1 })
      const e2 = await ctx.repositories.episodes.create({ seasonId: s1.id, episodeNumber: 2 })
      await ctx.repositories.episodes.create({ seasonId: s1.id, episodeNumber: 3 }) // left unwatched
      const e4 = await ctx.repositories.episodes.create({ seasonId: s2.id, episodeNumber: 1 })
      await ctx.repositories.episodeProgress.markWatched(e1.id)
      await ctx.repositories.episodeProgress.markWatched(e2.id)
      await ctx.repositories.episodeProgress.markWatched(e4.id)

      const counts = await ctx.repositories.episodeProgress.getWatchedCountsBySeasonNumber(show.id)

      expect(counts.get(1)).toBe(2)
      expect(counts.get(2)).toBe(1)
    })

    it('keeps different titles separate', async () => {
      const showA = await ctx.repositories.mediaItems.create({ type: 'tv', title: 'Show A', source: 'manual' })
      const showB = await ctx.repositories.mediaItems.create({ type: 'tv', title: 'Show B', source: 'manual' })
      const seasonA = await ctx.repositories.seasons.create({ mediaItemId: showA.id, seasonNumber: 1 })
      const seasonB = await ctx.repositories.seasons.create({ mediaItemId: showB.id, seasonNumber: 1 })
      const a1 = await ctx.repositories.episodes.create({ seasonId: seasonA.id, episodeNumber: 1 })
      await ctx.repositories.episodes.create({ seasonId: seasonB.id, episodeNumber: 1 })
      await ctx.repositories.episodeProgress.markWatched(a1.id)

      const counts = await ctx.repositories.episodeProgress.getWatchedCountsBySeasonNumber(showB.id)

      expect(counts.size).toBe(0)
    })
  })
})
