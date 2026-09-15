import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTestContext } from '../db/testUtils'
import type { Repositories } from '../db/repositories'
import type { OpenedDatabase } from '../db/client'
import { buildBackupFile } from './exportBackup'
import { parseBackupFile } from '@shared/backup'

let ctx: OpenedDatabase & { repositories: Repositories }

beforeEach(async () => {
  ctx = await createTestContext()
})

afterEach(() => {
  ctx.close()
})

describe('buildBackupFile', () => {
  it('produces an empty-but-valid backup for an empty library', async () => {
    const backup = await buildBackupFile(ctx.db, '0.1.0')

    expect(backup.formatVersion).toBe(2)
    expect(backup.appVersion).toBe('0.1.0')
    expect(backup.data.mediaItems).toEqual([])
    expect(backup.data.settings).toEqual({})
    // What buildBackupFile hands back must itself be accepted by the reader.
    expect(parseBackupFile(backup).ok).toBe(true)
  })

  it('captures every kind of personal data across a small mixed library', async () => {
    const { repositories } = ctx

    const show = await repositories.mediaItems.create({
      type: 'anime',
      title: 'A Show',
      source: 'manual',
      genres: ['Drama']
    })
    const entry = await repositories.libraryEntries.add({ mediaItemId: show.id })
    await repositories.libraryEntries.setFavorite(entry.id, true)
    await repositories.libraryEntries.setNotes(entry.id, 'Series note.')
    const season = await repositories.seasons.create({ mediaItemId: show.id, seasonNumber: 1 })
    await repositories.seasonRatings.rate(season.id, 8)
    const episode = await repositories.episodes.create({ seasonId: season.id, episodeNumber: 1 })
    await repositories.episodeProgress.markWatched(episode.id)
    await repositories.watchEvents.record(show.id, episode.id, '2026-01-10T00:00:00.000Z')
    const tag = await repositories.tags.create('Comfort watch')
    await repositories.tags.attachToMediaItem(show.id, tag.id)

    const backup = await buildBackupFile(ctx.db, '0.1.0')

    expect(backup.data.mediaItems).toHaveLength(1)
    expect(backup.data.mediaItems[0].genres).toEqual(['Drama'])
    expect(backup.data.libraryEntries[0].favorite).toBe(true)
    expect(backup.data.libraryEntries[0].notes).toBe('Series note.')
    expect(backup.data.seasonRatings[0].rating).toBe(8)
    expect(backup.data.episodeProgress[0].watched).toBe(true)
    expect(backup.data.watchEvents).toHaveLength(1)
    expect(backup.data.watchEvents[0].watchedAt).toBe('2026-01-10T00:00:00.000Z')
    expect(backup.data.tags.map((t) => t.name)).toEqual(['Comfort watch'])
    expect(backup.data.mediaTags).toEqual([{ mediaItemId: show.id, tagId: tag.id }])

    expect(parseBackupFile(backup).ok).toBe(true)
  })
})
