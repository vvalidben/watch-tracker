import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTestContext } from './testUtils'
import type { Repositories } from './repositories'
import type { OpenedDatabase } from './client'

let ctx: OpenedDatabase & { repositories: Repositories }

beforeEach(async () => {
  ctx = await createTestContext()
})

afterEach(() => {
  ctx.close()
})

describe('cascade deletes', () => {
  it('deleting a media item removes its seasons, episodes, progress, ratings, library entry, and tag links', async () => {
    const { repositories } = ctx

    const show = await repositories.mediaItems.create({
      type: 'tv',
      title: 'Cascade Show',
      source: 'manual'
    })
    const season = await repositories.seasons.create({ mediaItemId: show.id, seasonNumber: 1 })
    const episode = await repositories.episodes.create({ seasonId: season.id, episodeNumber: 1 })
    const libraryEntry = await repositories.libraryEntries.add({ mediaItemId: show.id })
    await repositories.episodeProgress.markWatched(episode.id)
    await repositories.watchEvents.record(show.id, episode.id, new Date().toISOString())
    await repositories.seasonRatings.rate(season.id, 8)
    const tag = await repositories.tags.create('Weeknight watch')
    await repositories.tags.attachToMediaItem(show.id, tag.id)

    await repositories.mediaItems.delete(show.id)

    expect(await repositories.seasons.getById(season.id)).toBeUndefined()
    expect(await repositories.episodes.getById(episode.id)).toBeUndefined()
    expect(await repositories.episodeProgress.getByEpisodeId(episode.id)).toBeUndefined()
    expect(await repositories.watchEvents.listForEpisode(episode.id)).toHaveLength(0)
    expect(await repositories.seasonRatings.getBySeasonId(season.id)).toBeUndefined()
    expect(await repositories.libraryEntries.getById(libraryEntry.id)).toBeUndefined()
    expect(await repositories.tags.listForMediaItem(show.id)).toHaveLength(0)

    // The tag itself is independent of any one media item and survives.
    expect(await repositories.tags.list()).toHaveLength(1)
  })

  it('deleting a season removes its episodes and season rating, but not the media item', async () => {
    const { repositories } = ctx

    const show = await repositories.mediaItems.create({
      type: 'tv',
      title: 'Another Show',
      source: 'manual'
    })
    const season = await repositories.seasons.create({ mediaItemId: show.id, seasonNumber: 1 })
    const episode = await repositories.episodes.create({ seasonId: season.id, episodeNumber: 1 })
    await repositories.seasonRatings.rate(season.id, 6)
    await repositories.watchEvents.record(show.id, episode.id, new Date().toISOString())

    await repositories.seasons.delete(season.id)

    expect(await repositories.episodes.getById(episode.id)).toBeUndefined()
    expect(await repositories.seasonRatings.getBySeasonId(season.id)).toBeUndefined()
    expect(await repositories.watchEvents.listForEpisode(episode.id)).toHaveLength(0)
    expect(await repositories.mediaItems.getById(show.id)).toBeDefined()
  })
})
