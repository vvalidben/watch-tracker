import { existsSync, renameSync } from 'node:fs'
import { openDatabase, type OpenDatabaseOptions, type OpenedDatabase } from './client'

export interface DatabaseOpenResult {
  opened: OpenedDatabase
  /** Set to the path the original file was moved to, if it had to be recovered from. */
  recoveredFrom: string | null
}

/**
 * Opens the database, recovering automatically if the file exists but can't
 * be read or migrated — truncated by a crash mid-write, disk corruption, or
 * even a stray non-SQLite file left at that path. Rather than leaving the
 * app permanently unusable (see the corrupted-database failure mode this
 * app hit during its own development, before watch_events existed and a
 * migration mismatch produced exactly this kind of unreadable state), the
 * bad file is moved aside with a timestamped name — never deleted, so a
 * technical user could still try to recover data from it — and a fresh
 * database is created in its place.
 *
 * Only retries once: if opening a *fresh* file also fails, the problem
 * isn't the old file's contents (permissions, a full disk, a locked
 * directory), and the error is rethrown as-is.
 */
export async function openDatabaseWithRecovery(options: OpenDatabaseOptions): Promise<DatabaseOpenResult> {
  try {
    return { opened: await openDatabase(options), recoveredFrom: null }
  } catch (error) {
    if (!options.filePath || !existsSync(options.filePath)) throw error

    const corruptedPath = `${options.filePath}.corrupted-${Date.now()}`
    console.error('[db] failed to open database — moving it aside and starting fresh', error)
    renameSync(options.filePath, corruptedPath)

    const opened = await openDatabase(options)
    return { opened, recoveredFrom: corruptedPath }
  }
}
