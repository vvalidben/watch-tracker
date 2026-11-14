import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTestContext } from '../db/testUtils'
import type { Repositories } from '../db/repositories'
import type { OpenedDatabase } from '../db/client'
import type { Episode, MediaItem } from '../db/types'
import { recordEpisodesWatched, recordEpisodeWatched, recordMovieWatched } from './watchHistory'

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

describe('recordEpisodeWatched', () => {
  it('appends a watch event without touching episode_progress', async () => {
    await recordEpisodeWatched(ctx.repositories, show.id, episode.id, '2026-01-10T00:00:00.000Z')

    const history = await ctx.repositories.watchEvents.listForEpisode(episode.id)
    expect(history.map((event) => event.watchedAt)).toEqual(['2026-01-10T00:00:00.000Z'])
  })

  it('supports rewatching: repeated calls accumulate multiple dates for the same episode', async () => {
    await recordEpisodeWatched(ctx.repositories, show.id, episode.id, '2026-01-10T00:00:00.000Z')
    await recordEpisodeWatched(ctx.repositories, show.id, episode.id, '2026-06-12T00:00:00.000Z')

    const history = await ctx.repositories.watchEvents.listForEpisode(episode.id)
    expect(history.map((event) => event.watchedAt)).toEqual([
      '2026-01-10T00:00:00.000Z',
      '2026-06-12T00:00:00.000Z'
    ])
  })
})

describe('recordEpisodesWatched (bulk)', () => {
  it('records one event per episode at the given timestamp', async () => {
    const season = await ctx.repositories.seasons.getById(episode.seasonId)
    const episode2 = await ctx.repositories.episodes.create({ seasonId: season!.id, episodeNumber: 6 })

    await recordEpisodesWatched(ctx.repositories, show.id, [episode.id, episode2.id], '2026-01-10T00:00:00.000Z')

    expect(await ctx.repositories.watchEvents.countForEpisode(episode.id)).toBe(1)
    expect(await ctx.repositories.watchEvents.countForEpisode(episode2.id)).toBe(1)
  })
})

describe('recordMovieWatched', () => {
  it('records a movie-level event and sets rewatchCount to 0 on the first watch', async () => {
    const movie = await ctx.repositories.mediaItems.create({ type: 'movie', title: 'A Movie', source: 'manual' })
    const entry = await ctx.repositories.libraryEntries.add({ mediaItemId: movie.id })

    await recordMovieWatched(ctx.repositories, movie.id, entry.id, '2026-01-10T00:00:00.000Z')

    const history = await ctx.repositories.watchEvents.listForMovie(movie.id)
    expect(history.map((event) => event.watchedAt)).toEqual(['2026-01-10T00:00:00.000Z'])
    const updatedEntry = await ctx.repositories.libraryEntries.getById(entry.id)
    expect(updatedEntry?.rewatchCount).toBe(0)
  })

  it('derives rewatchCount from the number of recorded watches beyond the first', async () => {
    const movie = await ctx.repositories.mediaItems.create({ type: 'movie', title: 'A Movie', source: 'manual' })
    const entry = await ctx.repositories.libraryEntries.add({ mediaItemId: movie.id })

    await recordMovieWatched(ctx.repositories, movie.id, entry.id, '2026-01-10T00:00:00.000Z')
    await recordMovieWatched(ctx.repositories, movie.id, entry.id, '2026-06-12T00:00:00.000Z')
    await recordMovieWatched(ctx.repositories, movie.id, entry.id, '2026-09-01T00:00:00.000Z')

    const updatedEntry = await ctx.repositories.libraryEntries.getById(entry.id)
    expect(updatedEntry?.rewatchCount).toBe(2)
    const history = await ctx.repositories.watchEvents.listForMovie(movie.id)
    expect(history).toHaveLength(3)
  })
})
