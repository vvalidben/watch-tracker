import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTestContext } from '../db/testUtils'
import type { Repositories } from '../db/repositories'
import type { OpenedDatabase } from '../db/client'
import { computeDashboard } from './dashboard'

let ctx: OpenedDatabase & { repositories: Repositories }

beforeEach(async () => {
  ctx = await createTestContext()
})

afterEach(() => {
  ctx.close()
})

describe('computeDashboard', () => {
  it('returns empty shelves and zeroed stats for an empty library', async () => {
    const dashboard = await computeDashboard(ctx.repositories)

    expect(dashboard.shelves.continueWatching).toEqual([])
    expect(dashboard.shelves.recentlyAdded).toEqual([])
    expect(dashboard.stats.moviesWatched).toBe(0)
    expect(dashboard.stats.totalEpisodesWatched).toBe(0)
    expect(dashboard.stats.averagePersonalRating).toBeNull()
  })

  it('counts total episodes watched even for a show with no cached episode count', async () => {
    const show = await ctx.repositories.mediaItems.create({
      type: 'anime',
      title: 'Unknown Length',
      source: 'manual',
      numberOfEpisodes: null // deliberately unknown, unlike the Library page's per-item progress
    })
    const season = await ctx.repositories.seasons.create({ mediaItemId: show.id, seasonNumber: 1 })
    const episode = await ctx.repositories.episodes.create({ seasonId: season.id, episodeNumber: 1 })
    await ctx.repositories.episodeProgress.markWatched(episode.id)
    await ctx.repositories.libraryEntries.add({ mediaItemId: show.id })

    const dashboard = await computeDashboard(ctx.repositories)

    // The per-item progress card would show nothing (total unknown)...
    const [item] = dashboard.shelves.recentlyAdded
    expect(item.progress).toBeNull()
    // ...but the dashboard stat still counts the watched episode.
    expect(dashboard.stats.totalEpisodesWatched).toBe(1)
  })

  it('builds a coherent picture across shelves and stats for a small mixed library', async () => {
    const movie = await ctx.repositories.mediaItems.create({ type: 'movie', title: 'A Movie', source: 'manual' })
    const movieEntry = await ctx.repositories.libraryEntries.add({ mediaItemId: movie.id })
    await ctx.repositories.libraryEntries.updateStatus(movieEntry.id, 'completed')
    await ctx.repositories.libraryEntries.rate(movieEntry.id, 9)

    const show = await ctx.repositories.mediaItems.create({
      type: 'tv',
      title: 'A Show',
      source: 'manual',
      numberOfEpisodes: 10
    })
    const showEntry = await ctx.repositories.libraryEntries.add({ mediaItemId: show.id })
    await ctx.repositories.libraryEntries.setFavorite(showEntry.id, true)
    const season = await ctx.repositories.seasons.create({ mediaItemId: show.id, seasonNumber: 1 })
    const episode = await ctx.repositories.episodes.create({ seasonId: season.id, episodeNumber: 1 })
    await ctx.repositories.episodeProgress.markWatched(episode.id)
    await ctx.repositories.libraryEntries.updateStatus(showEntry.id, 'watching')

    const planned = await ctx.repositories.mediaItems.create({ type: 'anime', title: 'Planned', source: 'manual' })
    await ctx.repositories.libraryEntries.add({ mediaItemId: planned.id })

    const dashboard = await computeDashboard(ctx.repositories)

    expect(dashboard.stats.moviesWatched).toBe(1)
    expect(dashboard.stats.favoritesCount).toBe(1)
    expect(dashboard.stats.averagePersonalRating).toBe(9)
    expect(dashboard.stats.totalEpisodesWatched).toBe(1)

    expect(dashboard.shelves.continueWatching.map((i) => i.mediaItem.title)).toEqual(['A Show'])
    expect(dashboard.shelves.favorites.map((i) => i.mediaItem.title)).toEqual(['A Show'])
    expect(dashboard.shelves.highestRated.map((i) => i.mediaItem.title)).toEqual(['A Movie'])
    expect(dashboard.shelves.watchlist.map((i) => i.mediaItem.title)).toEqual(['Planned'])
    expect(dashboard.shelves.recentlyAdded).toHaveLength(3)
  })
})
