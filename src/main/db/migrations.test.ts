import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { openDatabase } from './client'
import { createRepositories } from './repositories'

const migrationsFolder = join(__dirname, '..', '..', '..', 'drizzle', 'migrations')

let workDir: string

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), 'watch-tracker-migrations-test-'))
})

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true })
})

/**
 * A release-pass sanity check, separate from every other test's implicit
 * use of createTestContext(): applies every migration in order to a brand
 * new file (not :memory:) exactly the way a first-ever install would, and
 * confirms the resulting schema actually supports a full, cross-table
 * read/write — not just "migrate() didn't throw."
 */
describe('database migrations', () => {
  it('apply cleanly to a brand new file and produce a fully working schema', async () => {
    const dbPath = join(workDir, 'fresh-install.db')

    const { db, persist, close } = await openDatabase({ filePath: dbPath, migrationsFolder })
    const repositories = createRepositories({ db, persist })

    const movie = await repositories.mediaItems.create({ type: 'movie', title: 'A Movie', source: 'manual' })
    const entry = await repositories.libraryEntries.add({ mediaItemId: movie.id })
    await repositories.libraryEntries.rate(entry.id, 8.5)
    await repositories.libraryEntries.setFavorite(entry.id, true)

    const show = await repositories.mediaItems.create({ type: 'tv', title: 'A Show', source: 'manual' })
    const season = await repositories.seasons.create({ mediaItemId: show.id, seasonNumber: 1 })
    const episode = await repositories.episodes.create({ seasonId: season.id, episodeNumber: 1 })
    await repositories.episodeProgress.markWatched(episode.id)
    await repositories.watchEvents.record(show.id, episode.id, new Date().toISOString())
    const tag = await repositories.tags.create('Cozy')
    await repositories.tags.attachToMediaItem(show.id, tag.id)

    expect((await repositories.mediaItems.list())).toHaveLength(2)
    expect((await repositories.libraryEntries.getById(entry.id))?.rating).toBe(8.5)
    expect((await repositories.tags.listForMediaItem(show.id)).map((t) => t.name)).toEqual(['Cozy'])

    close()
  })

  it('running migrate() again on an already-migrated file is a safe no-op', async () => {
    const dbPath = join(workDir, 'reopened.db')

    const first = await openDatabase({ filePath: dbPath, migrationsFolder })
    const repositories = createRepositories({ db: first.db, persist: first.persist })
    await repositories.mediaItems.create({ type: 'movie', title: 'Persisted Movie', source: 'manual' })
    first.close()

    // Re-opening the same file re-runs migrate() against it (see client.ts) — this must not
    // fail or duplicate/lose anything already there.
    const second = await openDatabase({ filePath: dbPath, migrationsFolder })
    const reopenedRepositories = createRepositories({ db: second.db, persist: second.persist })
    const items = await reopenedRepositories.mediaItems.list()

    expect(items).toHaveLength(1)
    expect(items[0].title).toBe('Persisted Movie')
    second.close()
  })
})
