import { mkdtempSync, copyFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { LatestBackupFile } from '@shared/backup'
import { openDatabase } from '../db/client'
import { episodeProgress, episodes, libraryEntries, mediaItems, mediaTags, seasonRatings, seasons, tags, watchEvents } from '../db/schema'

export interface RestoreBackupOptions {
  migrationsFolder: string
  /** The live app's database file — only overwritten after the restore below fully succeeds. */
  targetDbPath: string
}

/**
 * Restores a backup by building an entirely new, freshly-migrated database
 * in a temp file, inserting every row into it, and only then replacing the
 * real database file with it. The live app's on-disk data is never touched
 * unless every insert above succeeds — if anything throws partway through
 * (a constraint violation, a full disk, whatever), the temp file is
 * discarded and the real database is exactly as it was before this call.
 *
 * Table insert order matters here (parents before children) because the
 * live database enforces foreign keys — see schema.ts.
 */
export async function restoreBackup(backup: LatestBackupFile, options: RestoreBackupOptions): Promise<void> {
  const tempDir = mkdtempSync(join(tmpdir(), 'watch-tracker-restore-'))
  const tempDbPath = join(tempDir, 'restored.db')

  try {
    const { db, persist, close } = await openDatabase({
      filePath: tempDbPath,
      migrationsFolder: options.migrationsFolder
    })

    try {
      const { data } = backup
      if (data.mediaItems.length > 0) await db.insert(mediaItems).values(data.mediaItems)
      if (data.tags.length > 0) await db.insert(tags).values(data.tags)
      if (data.seasons.length > 0) await db.insert(seasons).values(data.seasons)
      if (data.libraryEntries.length > 0) await db.insert(libraryEntries).values(data.libraryEntries)
      if (data.episodes.length > 0) await db.insert(episodes).values(data.episodes)
      if (data.seasonRatings.length > 0) await db.insert(seasonRatings).values(data.seasonRatings)
      if (data.episodeProgress.length > 0) await db.insert(episodeProgress).values(data.episodeProgress)
      if (data.watchEvents.length > 0) await db.insert(watchEvents).values(data.watchEvents)
      if (data.mediaTags.length > 0) await db.insert(mediaTags).values(data.mediaTags)

      persist()
    } finally {
      close()
    }

    copyFileSync(tempDbPath, options.targetDbPath)
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
}
