import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTestContext } from '../db/testUtils'
import type { Repositories } from '../db/repositories'
import type { OpenedDatabase } from '../db/client'
import { computeSeriesRatingRollup } from './ratings'

let ctx: OpenedDatabase & { repositories: Repositories }

beforeEach(async () => {
  ctx = await createTestContext()
})

afterEach(() => {
  ctx.close()
})

describe('computeSeriesRatingRollup', () => {
  it('returns nulls for a show with no seasons at all', async () => {
    const mediaItem = await ctx.repositories.mediaItems.create({
      type: 'tv',
      title: 'Untouched Show',
      source: 'manual'
    })

    const rollup = await computeSeriesRatingRollup(ctx.repositories, mediaItem.id)

    expect(rollup).toEqual({ averageSeasonRating: null, averageEpisodeRating: null })
  })

  it('returns nulls when seasons exist but nothing has been rated yet', async () => {
    const mediaItem = await ctx.repositories.mediaItems.create({
      type: 'tv',
      title: 'Fresh Show',
      source: 'manual'
    })
    const season = await ctx.repositories.seasons.create({ mediaItemId: mediaItem.id, seasonNumber: 1 })
    await ctx.repositories.episodes.create({ seasonId: season.id, episodeNumber: 1 })

    const rollup = await computeSeriesRatingRollup(ctx.repositories, mediaItem.id)

    expect(rollup).toEqual({ averageSeasonRating: null, averageEpisodeRating: null })
  })

  it('averages personal season ratings across every season', async () => {
    const mediaItem = await ctx.repositories.mediaItems.create({
      type: 'tv',
      title: 'Rated Show',
      source: 'manual'
    })
    const s1 = await ctx.repositories.seasons.create({ mediaItemId: mediaItem.id, seasonNumber: 1 })
    const s2 = await ctx.repositories.seasons.create({ mediaItemId: mediaItem.id, seasonNumber: 2 })
    await ctx.repositories.seasonRatings.rate(s1.id, 8)
    await ctx.repositories.seasonRatings.rate(s2.id, 9)

    const rollup = await computeSeriesRatingRollup(ctx.repositories, mediaItem.id)

    expect(rollup.averageSeasonRating).toBe(8.5)
  })

  it('only counts seasons that actually have a personal rating set', async () => {
    const mediaItem = await ctx.repositories.mediaItems.create({
      type: 'tv',
      title: 'Partially Rated Show',
      source: 'manual'
    })
    const s1 = await ctx.repositories.seasons.create({ mediaItemId: mediaItem.id, seasonNumber: 1 })
    await ctx.repositories.seasons.create({ mediaItemId: mediaItem.id, seasonNumber: 2 }) // unrated
    await ctx.repositories.seasonRatings.rate(s1.id, 7)

    const rollup = await computeSeriesRatingRollup(ctx.repositories, mediaItem.id)

    expect(rollup.averageSeasonRating).toBe(7)
  })

  it('averages every rated episode across every season', async () => {
    const mediaItem = await ctx.repositories.mediaItems.create({
      type: 'anime',
      title: 'Rated Anime',
      source: 'manual'
    })
    const s1 = await ctx.repositories.seasons.create({ mediaItemId: mediaItem.id, seasonNumber: 1 })
    const s2 = await ctx.repositories.seasons.create({ mediaItemId: mediaItem.id, seasonNumber: 2 })

    const e1 = await ctx.repositories.episodes.create({ seasonId: s1.id, episodeNumber: 1 })
    const e2 = await ctx.repositories.episodes.create({ seasonId: s1.id, episodeNumber: 2 })
    const e3 = await ctx.repositories.episodes.create({ seasonId: s2.id, episodeNumber: 1 })
    await ctx.repositories.episodeProgress.rate(e1.id, 9)
    await ctx.repositories.episodeProgress.rate(e2.id, 8)
    await ctx.repositories.episodeProgress.rate(e3.id, 10)

    const rollup = await computeSeriesRatingRollup(ctx.repositories, mediaItem.id)

    expect(rollup.averageEpisodeRating).toBe(9)
  })

  it('ignores episodes that are watched but not rated', async () => {
    const mediaItem = await ctx.repositories.mediaItems.create({
      type: 'anime',
      title: 'Mixed Anime',
      source: 'manual'
    })
    const season = await ctx.repositories.seasons.create({ mediaItemId: mediaItem.id, seasonNumber: 1 })
    const rated = await ctx.repositories.episodes.create({ seasonId: season.id, episodeNumber: 1 })
    const watchedOnly = await ctx.repositories.episodes.create({ seasonId: season.id, episodeNumber: 2 })
    await ctx.repositories.episodeProgress.rate(rated.id, 8)
    await ctx.repositories.episodeProgress.markWatched(watchedOnly.id)

    const rollup = await computeSeriesRatingRollup(ctx.repositories, mediaItem.id)

    expect(rollup.averageEpisodeRating).toBe(8)
  })

  it('computes season and episode rollups independently of each other', async () => {
    const mediaItem = await ctx.repositories.mediaItems.create({
      type: 'tv',
      title: 'Independent Rollups',
      source: 'manual'
    })
    const season = await ctx.repositories.seasons.create({ mediaItemId: mediaItem.id, seasonNumber: 1 })
    await ctx.repositories.seasonRatings.rate(season.id, 6)
    const episode = await ctx.repositories.episodes.create({ seasonId: season.id, episodeNumber: 1 })
    await ctx.repositories.episodeProgress.rate(episode.id, 10)

    const rollup = await computeSeriesRatingRollup(ctx.repositories, mediaItem.id)

    expect(rollup.averageSeasonRating).toBe(6)
    expect(rollup.averageEpisodeRating).toBe(10)
  })
})
