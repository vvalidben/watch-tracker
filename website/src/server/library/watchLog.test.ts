import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTestContext } from '../db/testUtils'
import type { Repositories } from '../db/repositories'
import type { OpenedDatabase } from '../db/client'
import { computeWatchLog } from './watchLog'

let ctx: OpenedDatabase & { repositories: Repositories }

beforeEach(async () => {
  ctx = await createTestContext()
})

afterEach(() => {
  ctx.close()
})

async function addShow(title: string, sourceId: string) {
  const { repositories } = ctx
  const media = await repositories.mediaItems.create({ type: 'tv', title, source: 'tmdb', sourceId, numberOfSeasons: 2 })
  await repositories.libraryEntries.add({ mediaItemId: media.id })
  return media
}

describe('computeWatchLog', () => {
  it('returns newest first, resolving each event to its season and episode number', async () => {
    const { repositories } = ctx
    const show = await addShow('Show', '1')
    const season = await repositories.seasons.create({ mediaItemId: show.id, seasonNumber: 2 })
    const first = await repositories.episodes.create({ seasonId: season.id, episodeNumber: 1 })
    const second = await repositories.episodes.create({ seasonId: season.id, episodeNumber: 2 })
    await repositories.watchEvents.record(show.id, first.id, '2026-01-01T10:00:00.000Z')
    await repositories.watchEvents.record(show.id, second.id, '2026-01-02T10:00:00.000Z')

    const { entries } = await computeWatchLog(repositories)

    expect(entries.map((entry) => [entry.title, entry.seasonNumber, entry.episodeNumber])).toEqual([
      ['Show', 2, 2],
      ['Show', 2, 1]
    ])
    expect(entries[0]).toMatchObject({ source: 'tmdb', sourceId: '1', mediaType: 'tv', numberOfSeasons: 2 })
  })

  it('orders a bulk mark, which shares one timestamp, by descending episode', async () => {
    const { repositories } = ctx
    const show = await addShow('Show', '1')
    const season = await repositories.seasons.create({ mediaItemId: show.id, seasonNumber: 1 })
    const first = await repositories.episodes.create({ seasonId: season.id, episodeNumber: 1 })
    const second = await repositories.episodes.create({ seasonId: season.id, episodeNumber: 2 })
    await repositories.watchEvents.recordMany(show.id, [first.id, second.id], '2026-01-01T10:00:00.000Z')

    const { entries } = await computeWatchLog(repositories)

    expect(entries.map((entry) => entry.episodeNumber)).toEqual([2, 1])
  })

  it('reports a movie event with null season and episode', async () => {
    const { repositories } = ctx
    const movie = await repositories.mediaItems.create({ type: 'movie', title: 'Film', source: 'tmdb', sourceId: '2' })
    await repositories.libraryEntries.add({ mediaItemId: movie.id })
    await repositories.watchEvents.record(movie.id, null, '2026-01-01T10:00:00.000Z')

    const { entries } = await computeWatchLog(repositories)

    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({ title: 'Film', seasonNumber: null, episodeNumber: null })
  })

  it('leaves out titles that are no longer in the library', async () => {
    const { repositories } = ctx
    const untracked = await repositories.mediaItems.create({ type: 'movie', title: 'Gone', source: 'tmdb', sourceId: '3' })
    await repositories.watchEvents.record(untracked.id, null, '2026-01-01T10:00:00.000Z')

    expect((await computeWatchLog(repositories)).entries).toEqual([])
  })
})
