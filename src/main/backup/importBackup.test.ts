import { mkdtempSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { LatestBackupFile } from '@shared/backup'
import { openDatabase } from '../db/client'
import { createRepositories } from '../db/repositories'
import { restoreBackup } from './importBackup'
import { buildBackupFile } from './exportBackup'

const migrationsFolder = join(__dirname, '..', '..', '..', 'drizzle', 'migrations')

let workDir: string
let targetDbPath: string

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), 'watch-tracker-restore-test-'))
  targetDbPath = join(workDir, 'watch-tracker.db')
})

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true })
})

function makeBackup(overrides: Partial<LatestBackupFile['data']> = {}): LatestBackupFile {
  return {
    formatVersion: 2,
    exportedAt: '2026-01-01T00:00:00.000Z',
    appVersion: '0.1.0',
    data: {
      mediaItems: [],
      seasons: [],
      episodes: [],
      libraryEntries: [],
      episodeProgress: [],
      seasonRatings: [],
      watchEvents: [],
      tags: [],
      mediaTags: [],
      settings: {},
      ...overrides
    }
  }
}

describe('restoreBackup', () => {
  it('creates a working database file at the target path from an empty backup', async () => {
    await restoreBackup(makeBackup(), { migrationsFolder, targetDbPath })

    expect(existsSync(targetDbPath)).toBe(true)
    const opened = await openDatabase({ filePath: targetDbPath, migrationsFolder })
    const repositories = createRepositories({ db: opened.db, persist: opened.persist })
    expect(await repositories.mediaItems.list()).toEqual([])
    opened.close()
  })

  it('restores every table, preserving explicit ids and cross-table relationships', async () => {
    const backup = makeBackup({
      mediaItems: [
        {
          id: 7,
          type: 'anime',
          title: 'Restored Show',
          originalTitle: null,
          overview: null,
          posterPath: null,
          backdropPath: null,
          releaseDate: null,
          airingStatus: null,
          runtimeMinutes: null,
          numberOfSeasons: null,
          numberOfEpisodes: null,
          genres: ['Drama'],
          source: 'manual',
          sourceId: null,
          externalIds: null,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z'
        }
      ],
      seasons: [{ id: 3, mediaItemId: 7, seasonNumber: 1, title: null, overview: null, posterPath: null, airDate: null }],
      episodes: [{ id: 9, seasonId: 3, episodeNumber: 1, title: null, overview: null, airDate: null, runtimeMinutes: null }],
      libraryEntries: [
        {
          id: 2,
          mediaItemId: 7,
          watchStatus: 'watching',
          rating: 8.5,
          favorite: true,
          notes: 'Restored note.',
          rewatchCount: 0,
          addedAt: '2026-01-01T00:00:00.000Z',
          startedAt: '2026-01-01T00:00:00.000Z',
          completedAt: null,
          updatedAt: '2026-01-01T00:00:00.000Z'
        }
      ],
      episodeProgress: [
        { id: 5, episodeId: 9, watched: true, watchedAt: '2026-01-05T00:00:00.000Z', rating: null, notes: null, updatedAt: '2026-01-05T00:00:00.000Z' }
      ],
      watchEvents: [{ id: 11, mediaItemId: 7, episodeId: 9, watchedAt: '2026-01-05T00:00:00.000Z' }],
      tags: [{ id: 4, name: 'Comfort watch', color: null, createdAt: '2026-01-01T00:00:00.000Z' }],
      mediaTags: [{ mediaItemId: 7, tagId: 4 }]
    })

    await restoreBackup(backup, { migrationsFolder, targetDbPath })

    const opened = await openDatabase({ filePath: targetDbPath, migrationsFolder })
    const repositories = createRepositories({ db: opened.db, persist: opened.persist })

    const mediaItem = await repositories.mediaItems.getById(7)
    expect(mediaItem?.title).toBe('Restored Show')
    expect(mediaItem?.genres).toEqual(['Drama'])

    const entry = await repositories.libraryEntries.getByMediaItemId(7)
    expect(entry?.favorite).toBe(true)
    expect(entry?.notes).toBe('Restored note.')
    expect(entry?.rating).toBe(8.5)

    const episode = await repositories.episodes.getById(9)
    expect(episode?.seasonId).toBe(3)

    const progress = await repositories.episodeProgress.getByEpisodeId(9)
    expect(progress?.watched).toBe(true)

    const history = await repositories.watchEvents.listForEpisode(9)
    expect(history.map((e) => e.watchedAt)).toEqual(['2026-01-05T00:00:00.000Z'])

    const tagsForItem = await repositories.tags.listForMediaItem(7)
    expect(tagsForItem.map((t) => t.name)).toEqual(['Comfort watch'])

    opened.close()
  })

  it('fully replaces whatever was previously at the target path', async () => {
    // Seed an existing database at the target path with data that must NOT survive the restore.
    const existing = await openDatabase({ filePath: targetDbPath, migrationsFolder })
    const existingRepositories = createRepositories({ db: existing.db, persist: existing.persist })
    await existingRepositories.mediaItems.create({ type: 'movie', title: 'Old Data', source: 'manual' })
    existing.close()

    await restoreBackup(makeBackup(), { migrationsFolder, targetDbPath })

    const opened = await openDatabase({ filePath: targetDbPath, migrationsFolder })
    const repositories = createRepositories({ db: opened.db, persist: opened.persist })
    expect(await repositories.mediaItems.list()).toEqual([])
    opened.close()
  })

  it('round-trips a real export back through a restore without loss', async () => {
    const source = await openDatabase({ filePath: join(workDir, 'source.db'), migrationsFolder })
    const sourceRepositories = createRepositories({ db: source.db, persist: source.persist })
    const movie = await sourceRepositories.mediaItems.create({ type: 'movie', title: 'Round Trip', source: 'manual' })
    const entry = await sourceRepositories.libraryEntries.add({ mediaItemId: movie.id })
    await sourceRepositories.libraryEntries.rate(entry.id, 7.5)
    const backup = await buildBackupFile(source.db, '0.1.0')
    source.close()

    await restoreBackup(backup, { migrationsFolder, targetDbPath })

    const opened = await openDatabase({ filePath: targetDbPath, migrationsFolder })
    const repositories = createRepositories({ db: opened.db, persist: opened.persist })
    const restoredEntry = await repositories.libraryEntries.getByMediaItemId(movie.id)
    expect(restoredEntry?.rating).toBe(7.5)
    opened.close()
  })
})
