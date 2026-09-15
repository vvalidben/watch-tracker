import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTestContext } from '../testUtils'
import type { Repositories } from './index'
import type { OpenedDatabase } from '../client'
import type { Season } from '../types'

let ctx: OpenedDatabase & { repositories: Repositories }
let season: Season

beforeEach(async () => {
  ctx = await createTestContext()
  const show = await ctx.repositories.mediaItems.create({
    type: 'tv',
    title: 'Test Show',
    source: 'manual'
  })
  season = await ctx.repositories.seasons.create({ mediaItemId: show.id, seasonNumber: 1 })
})

afterEach(() => {
  ctx.close()
})

describe('episodes repository', () => {
  it('creates an episode under a season', async () => {
    const episode = await ctx.repositories.episodes.create({
      seasonId: season.id,
      episodeNumber: 1,
      title: 'Pilot'
    })

    expect(episode.id).toBeTypeOf('number')
    expect(episode.seasonId).toBe(season.id)
  })

  it('rejects a duplicate episode number within the same season', async () => {
    await ctx.repositories.episodes.create({ seasonId: season.id, episodeNumber: 1 })

    await expect(
      ctx.repositories.episodes.create({ seasonId: season.id, episodeNumber: 1 })
    ).rejects.toThrow()
  })

  it('lists episodes for a season ordered by episode number', async () => {
    await ctx.repositories.episodes.create({ seasonId: season.id, episodeNumber: 2 })
    await ctx.repositories.episodes.create({ seasonId: season.id, episodeNumber: 1 })

    const episodes = await ctx.repositories.episodes.listBySeason(season.id)
    expect(episodes.map((e) => e.episodeNumber)).toEqual([1, 2])
  })

  it('attaches watch progress in listBySeasonWithProgress, defaulting to null', async () => {
    const episode = await ctx.repositories.episodes.create({ seasonId: season.id, episodeNumber: 1 })

    const [beforeWatch] = await ctx.repositories.episodes.listBySeasonWithProgress(season.id)
    expect(beforeWatch.progress).toBeNull()

    await ctx.repositories.episodeProgress.markWatched(episode.id)

    const [afterWatch] = await ctx.repositories.episodes.listBySeasonWithProgress(season.id)
    expect(afterWatch.progress?.watched).toBe(true)
  })

  it('deletes an episode', async () => {
    const episode = await ctx.repositories.episodes.create({ seasonId: season.id, episodeNumber: 1 })
    await ctx.repositories.episodes.delete(episode.id)
    expect(await ctx.repositories.episodes.getById(episode.id)).toBeUndefined()
  })

  describe('ensureMany', () => {
    it('creates every episode that does not already exist', async () => {
      const created = await ctx.repositories.episodes.ensureMany(season.id, [1, 2, 3])

      expect(created.map((e) => e.episodeNumber).sort((a, b) => a - b)).toEqual([1, 2, 3])
      expect(await ctx.repositories.episodes.listBySeason(season.id)).toHaveLength(3)
    })

    it('reuses episodes that already exist instead of duplicating them', async () => {
      const existing = await ctx.repositories.episodes.create({ seasonId: season.id, episodeNumber: 1 })

      const result = await ctx.repositories.episodes.ensureMany(season.id, [1, 2])

      expect(result.find((e) => e.episodeNumber === 1)?.id).toBe(existing.id)
      expect(await ctx.repositories.episodes.listBySeason(season.id)).toHaveLength(2)
    })

    it('returns an empty array for an empty input without touching the database', async () => {
      const result = await ctx.repositories.episodes.ensureMany(season.id, [])
      expect(result).toEqual([])
    })
  })
})
