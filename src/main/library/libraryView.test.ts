import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTestContext } from '../db/testUtils'
import type { Repositories } from '../db/repositories'
import type { OpenedDatabase } from '../db/client'
import { listLibrary } from './libraryView'

let ctx: OpenedDatabase & { repositories: Repositories }

beforeEach(async () => {
  ctx = await createTestContext()
})

afterEach(() => {
  ctx.close()
})

describe('listLibrary', () => {
  it('returns an empty list for an empty library', async () => {
    const items = await listLibrary(ctx.repositories, {})
    expect(items).toEqual([])
  })

  it('computes null progress for a movie', async () => {
    const movie = await ctx.repositories.mediaItems.create({
      type: 'movie',
      title: 'Paddington 2',
      source: 'manual'
    })
    await ctx.repositories.libraryEntries.add({ mediaItemId: movie.id })

    const [item] = await listLibrary(ctx.repositories, {})

    expect(item.progress).toBeNull()
  })

  it('computes null progress for a show with no cached episode count', async () => {
    const show = await ctx.repositories.mediaItems.create({
      type: 'tv',
      title: 'Unknown Length Show',
      source: 'manual',
      numberOfEpisodes: null
    })
    await ctx.repositories.libraryEntries.add({ mediaItemId: show.id })

    const [item] = await listLibrary(ctx.repositories, {})

    expect(item.progress).toBeNull()
  })

  it('computes watched/total/percentage progress for a show using cached episode count and local watched data', async () => {
    const show = await ctx.repositories.mediaItems.create({
      type: 'anime',
      title: 'Some Anime',
      source: 'manual',
      numberOfEpisodes: 12
    })
    const season = await ctx.repositories.seasons.create({ mediaItemId: show.id, seasonNumber: 1 })
    const e1 = await ctx.repositories.episodes.create({ seasonId: season.id, episodeNumber: 1 })
    const e2 = await ctx.repositories.episodes.create({ seasonId: season.id, episodeNumber: 2 })
    await ctx.repositories.episodeProgress.markWatched(e1.id)
    await ctx.repositories.episodeProgress.markWatched(e2.id)
    await ctx.repositories.libraryEntries.add({ mediaItemId: show.id })

    const [item] = await listLibrary(ctx.repositories, {})

    expect(item.progress).toEqual({ watchedEpisodes: 2, totalEpisodes: 12, percentage: 17 })
  })

  it('never calls anything network-related — progress comes only from local data', async () => {
    // No metadata service is even passed in; if listLibrary tried to reach
    // one, this test would throw a TypeError from calling undefined.
    const show = await ctx.repositories.mediaItems.create({
      type: 'tv',
      title: 'Local Only',
      source: 'tmdb',
      sourceId: '1',
      numberOfEpisodes: 10
    })
    await ctx.repositories.libraryEntries.add({ mediaItemId: show.id })

    await expect(listLibrary(ctx.repositories, {})).resolves.toBeDefined()
  })

  it('uses completedAt as lastWatchedAt for a movie', async () => {
    const movie = await ctx.repositories.mediaItems.create({ type: 'movie', title: 'A Movie', source: 'manual' })
    const entry = await ctx.repositories.libraryEntries.add({ mediaItemId: movie.id })
    await ctx.repositories.libraryEntries.updateStatus(entry.id, 'completed')

    const [item] = await listLibrary(ctx.repositories, {})

    expect(item.lastWatchedAt).toBeTruthy()
  })

  it('uses the most recent episode watchedAt as lastWatchedAt for a show', async () => {
    const show = await ctx.repositories.mediaItems.create({ type: 'tv', title: 'A Show', source: 'manual' })
    const season = await ctx.repositories.seasons.create({ mediaItemId: show.id, seasonNumber: 1 })
    const episode = await ctx.repositories.episodes.create({ seasonId: season.id, episodeNumber: 1 })
    await ctx.repositories.episodeProgress.markWatched(episode.id)
    await ctx.repositories.libraryEntries.add({ mediaItemId: show.id })

    const [item] = await listLibrary(ctx.repositories, {})

    expect(item.lastWatchedAt).toBeTruthy()
  })

  it('applies type, status, favorite, and search filters together', async () => {
    const wantedAnime = await ctx.repositories.mediaItems.create({
      type: 'anime',
      title: 'Wanted Anime',
      source: 'manual'
    })
    const otherAnime = await ctx.repositories.mediaItems.create({
      type: 'anime',
      title: 'Other Anime',
      source: 'manual'
    })
    const movie = await ctx.repositories.mediaItems.create({ type: 'movie', title: 'Wanted Movie', source: 'manual' })

    const wantedEntry = await ctx.repositories.libraryEntries.add({ mediaItemId: wantedAnime.id })
    await ctx.repositories.libraryEntries.add({ mediaItemId: otherAnime.id })
    await ctx.repositories.libraryEntries.add({ mediaItemId: movie.id })
    await ctx.repositories.libraryEntries.setFavorite(wantedEntry.id, true)
    await ctx.repositories.libraryEntries.updateStatus(wantedEntry.id, 'watching')

    const results = await listLibrary(ctx.repositories, {
      type: 'anime',
      status: 'watching',
      favoritesOnly: true,
      search: 'Wanted'
    })

    expect(results).toHaveLength(1)
    expect(results[0].mediaItem.title).toBe('Wanted Anime')
  })

  it('sorts results according to the requested sort key', async () => {
    const a = await ctx.repositories.mediaItems.create({ type: 'movie', title: 'Zebra', source: 'manual' })
    const b = await ctx.repositories.mediaItems.create({ type: 'movie', title: 'Apple', source: 'manual' })
    await ctx.repositories.libraryEntries.add({ mediaItemId: a.id })
    await ctx.repositories.libraryEntries.add({ mediaItemId: b.id })

    const results = await listLibrary(ctx.repositories, { sort: 'alphabetical' })

    expect(results.map((item) => item.mediaItem.title)).toEqual(['Apple', 'Zebra'])
  })

  it('filters by tag', async () => {
    const tagged = await ctx.repositories.mediaItems.create({ type: 'movie', title: 'Tagged', source: 'manual' })
    const untagged = await ctx.repositories.mediaItems.create({ type: 'movie', title: 'Untagged', source: 'manual' })
    await ctx.repositories.libraryEntries.add({ mediaItemId: tagged.id })
    await ctx.repositories.libraryEntries.add({ mediaItemId: untagged.id })
    const tag = await ctx.repositories.tags.create('Comfort watch')
    await ctx.repositories.tags.attachToMediaItem(tagged.id, tag.id)

    const results = await listLibrary(ctx.repositories, { tagId: tag.id })

    expect(results.map((item) => item.mediaItem.title)).toEqual(['Tagged'])
  })

  it('returns nothing for a tag that matches no library items', async () => {
    const movie = await ctx.repositories.mediaItems.create({ type: 'movie', title: 'A Movie', source: 'manual' })
    await ctx.repositories.libraryEntries.add({ mediaItemId: movie.id })
    const tag = await ctx.repositories.tags.create('Unused Tag')

    const results = await listLibrary(ctx.repositories, { tagId: tag.id })

    expect(results).toEqual([])
  })

  it('defaults to recently_added when no sort is given', async () => {
    const a = await ctx.repositories.mediaItems.create({ type: 'movie', title: 'First Added', source: 'manual' })
    await ctx.repositories.libraryEntries.add({ mediaItemId: a.id })
    await new Promise((resolve) => setTimeout(resolve, 2))
    const b = await ctx.repositories.mediaItems.create({ type: 'movie', title: 'Second Added', source: 'manual' })
    await ctx.repositories.libraryEntries.add({ mediaItemId: b.id })

    const results = await listLibrary(ctx.repositories, {})

    expect(results.map((item) => item.mediaItem.title)).toEqual(['Second Added', 'First Added'])
  })
})
