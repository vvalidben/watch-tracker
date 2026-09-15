import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTestContext } from '../testUtils'
import type { Repositories } from './index'
import type { OpenedDatabase } from '../client'
import type { MediaItem } from '../types'

let ctx: OpenedDatabase & { repositories: Repositories }
let show: MediaItem

beforeEach(async () => {
  ctx = await createTestContext()
  show = await ctx.repositories.mediaItems.create({
    type: 'tv',
    title: 'Test Show',
    source: 'manual'
  })
})

afterEach(() => {
  ctx.close()
})

describe('seasons repository', () => {
  it('creates a season under a media item', async () => {
    const season = await ctx.repositories.seasons.create({
      mediaItemId: show.id,
      seasonNumber: 1,
      title: 'Season One'
    })

    expect(season.id).toBeTypeOf('number')
    expect(season.mediaItemId).toBe(show.id)
  })

  it('rejects a duplicate season number for the same media item', async () => {
    await ctx.repositories.seasons.create({ mediaItemId: show.id, seasonNumber: 1 })

    await expect(
      ctx.repositories.seasons.create({ mediaItemId: show.id, seasonNumber: 1 })
    ).rejects.toThrow()
  })

  it('lists seasons for a media item ordered by season number', async () => {
    await ctx.repositories.seasons.create({ mediaItemId: show.id, seasonNumber: 2 })
    await ctx.repositories.seasons.create({ mediaItemId: show.id, seasonNumber: 1 })

    const seasons = await ctx.repositories.seasons.listByMediaItem(show.id)
    expect(seasons.map((s) => s.seasonNumber)).toEqual([1, 2])
  })

  it('includes episodes and season rating in listByMediaItemWithEpisodes', async () => {
    const season = await ctx.repositories.seasons.create({ mediaItemId: show.id, seasonNumber: 1 })
    await ctx.repositories.episodes.create({ seasonId: season.id, episodeNumber: 1, title: 'Pilot' })
    await ctx.repositories.seasonRatings.rate(season.id, 8.5)

    const [withEpisodes] = await ctx.repositories.seasons.listByMediaItemWithEpisodes(show.id)
    expect(withEpisodes.episodes).toHaveLength(1)
    expect(withEpisodes.episodes[0].title).toBe('Pilot')
    expect(withEpisodes.seasonRating?.rating).toBe(8.5)
  })

  it('returns null season rating when none has been set', async () => {
    const season = await ctx.repositories.seasons.create({ mediaItemId: show.id, seasonNumber: 1 })

    const [withEpisodes] = await ctx.repositories.seasons.listByMediaItemWithEpisodes(show.id)
    expect(withEpisodes.id).toBe(season.id)
    expect(withEpisodes.seasonRating).toBeNull()
  })

  it('deletes a season', async () => {
    const season = await ctx.repositories.seasons.create({ mediaItemId: show.id, seasonNumber: 1 })
    await ctx.repositories.seasons.delete(season.id)
    expect(await ctx.repositories.seasons.getById(season.id)).toBeUndefined()
  })
})
