import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTestContext } from '../db/testUtils'
import type { Repositories } from '../db/repositories'
import type { OpenedDatabase } from '../db/client'
import { computeLibraryStatistics } from './statistics'

let ctx: OpenedDatabase & { repositories: Repositories }

beforeEach(async () => {
  ctx = await createTestContext()
})

afterEach(() => {
  ctx.close()
})

describe('computeLibraryStatistics', () => {
  it('returns zeroed/empty statistics for an empty library', async () => {
    const { statistics } = await computeLibraryStatistics(ctx.repositories)

    expect(statistics.overview.totalEpisodesWatched).toBe(0)
    expect(statistics.highestRated).toEqual([])
    expect(statistics.lowestRated).toEqual([])
    expect(statistics.favoriteGenres).toEqual([])
    expect(statistics.completion.totalInLibrary).toBe(0)
    expect(statistics.completion.completionRate).toBeNull()
  })

  it('buckets episode and movie watch events into their own monthly trends', async () => {
    const movie = await ctx.repositories.mediaItems.create({ type: 'movie', title: 'A Movie', source: 'manual' })
    const movieEntry = await ctx.repositories.libraryEntries.add({ mediaItemId: movie.id })
    await ctx.repositories.watchEvents.record(movie.id, null, new Date().toISOString())
    void movieEntry

    const show = await ctx.repositories.mediaItems.create({ type: 'tv', title: 'A Show', source: 'manual' })
    await ctx.repositories.libraryEntries.add({ mediaItemId: show.id })
    const season = await ctx.repositories.seasons.create({ mediaItemId: show.id, seasonNumber: 1 })
    const episode = await ctx.repositories.episodes.create({ seasonId: season.id, episodeNumber: 1 })
    await ctx.repositories.watchEvents.record(show.id, episode.id, new Date().toISOString())

    const { statistics } = await computeLibraryStatistics(ctx.repositories)

    expect(statistics.moviesByMonth.at(-1)?.count).toBe(1)
    expect(statistics.episodesByMonth.at(-1)?.count).toBe(1)
  })

  it('counts a rewatch as a second event in the same month bucket', async () => {
    const movie = await ctx.repositories.mediaItems.create({ type: 'movie', title: 'A Movie', source: 'manual' })
    await ctx.repositories.libraryEntries.add({ mediaItemId: movie.id })
    const now = new Date().toISOString()
    await ctx.repositories.watchEvents.record(movie.id, null, now)
    await ctx.repositories.watchEvents.record(movie.id, null, now)

    const { statistics } = await computeLibraryStatistics(ctx.repositories)

    expect(statistics.moviesByMonth.at(-1)?.count).toBe(2)
  })

  it('stops counting a title toward totals once it is removed from the library', async () => {
    const movie = await ctx.repositories.mediaItems.create({ type: 'movie', title: 'A Movie', source: 'manual' })
    const entry = await ctx.repositories.libraryEntries.add({ mediaItemId: movie.id })
    await ctx.repositories.libraryEntries.updateStatus(entry.id, 'completed')
    await ctx.repositories.watchEvents.record(movie.id, null, new Date().toISOString())

    const before = await computeLibraryStatistics(ctx.repositories)
    expect(before.statistics.overview.moviesWatched).toBe(1)
    expect(before.statistics.moviesByMonth.at(-1)?.count).toBe(1)

    await ctx.repositories.libraryEntries.remove(entry.id)

    const after = await computeLibraryStatistics(ctx.repositories)
    expect(after.statistics.overview.moviesWatched).toBe(0)
    expect(after.statistics.moviesByMonth.at(-1)?.count).toBe(0)
  })

  it('keeps rating rankings and genre stats correct after editing an item (re-rating, changing status)', async () => {
    const show = await ctx.repositories.mediaItems.create({
      type: 'anime',
      title: 'An Anime',
      source: 'manual',
      genres: ['Fantasy']
    })
    const entry = await ctx.repositories.libraryEntries.add({ mediaItemId: show.id })
    await ctx.repositories.libraryEntries.rate(entry.id, 4)
    await ctx.repositories.libraryEntries.updateStatus(entry.id, 'plan_to_watch')

    const before = await computeLibraryStatistics(ctx.repositories)
    expect(before.statistics.highestRated[0]?.rating).toBe(4)
    // Still plan-to-watch, so its genre doesn't count as "favorite" yet.
    expect(before.statistics.favoriteGenres).toEqual([])

    // The user edits their rating and starts watching it.
    await ctx.repositories.libraryEntries.rate(entry.id, 9.5)
    await ctx.repositories.libraryEntries.updateStatus(entry.id, 'watching')

    const after = await computeLibraryStatistics(ctx.repositories)
    expect(after.statistics.highestRated[0]?.rating).toBe(9.5)
    expect(after.statistics.favoriteGenres).toEqual([{ genre: 'Fantasy', count: 1 }])
  })

  it('unwatching an episode does not remove its historical watch event from the monthly trend', async () => {
    const show = await ctx.repositories.mediaItems.create({ type: 'tv', title: 'A Show', source: 'manual' })
    await ctx.repositories.libraryEntries.add({ mediaItemId: show.id })
    const season = await ctx.repositories.seasons.create({ mediaItemId: show.id, seasonNumber: 1 })
    const episode = await ctx.repositories.episodes.create({ seasonId: season.id, episodeNumber: 1 })
    await ctx.repositories.watchEvents.record(show.id, episode.id, new Date().toISOString())
    await ctx.repositories.episodeProgress.markWatched(episode.id)

    await ctx.repositories.episodeProgress.markUnwatched(episode.id)

    const { statistics } = await computeLibraryStatistics(ctx.repositories)
    // The "currently watched" total drops...
    expect(statistics.overview.totalEpisodesWatched).toBe(0)
    // ...but the historical fact that an episode was watched that month remains.
    expect(statistics.episodesByMonth.at(-1)?.count).toBe(1)
  })
})
