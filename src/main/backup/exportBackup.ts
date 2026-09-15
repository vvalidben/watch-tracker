import { getTableColumns } from 'drizzle-orm'
import { BACKUP_FORMAT_VERSION, type LatestBackupFile } from '@shared/backup'
import type { AppDatabase } from '../db/client'
import { episodeProgress, episodes, libraryEntries, mediaItems, mediaTags, seasonRatings, seasons, tags, watchEvents } from '../db/schema'

/**
 * Reads every row of every personal-data table (plus the metadata tables
 * they reference, so a restore doesn't produce orphaned rows) straight from
 * the local database — no network access, no metadata provider involved.
 */
export async function buildBackupFile(db: AppDatabase, appVersion: string): Promise<LatestBackupFile> {
  const [
    mediaItemRows,
    seasonRows,
    episodeRows,
    libraryEntryRows,
    episodeProgressRows,
    seasonRatingRows,
    watchEventRows,
    tagRows,
    mediaTagRows
  ] = await Promise.all([
    db.select(getTableColumns(mediaItems)).from(mediaItems),
    db.select(getTableColumns(seasons)).from(seasons),
    db.select(getTableColumns(episodes)).from(episodes),
    db.select(getTableColumns(libraryEntries)).from(libraryEntries),
    db.select(getTableColumns(episodeProgress)).from(episodeProgress),
    db.select(getTableColumns(seasonRatings)).from(seasonRatings),
    db.select(getTableColumns(watchEvents)).from(watchEvents),
    db.select(getTableColumns(tags)).from(tags),
    db.select(getTableColumns(mediaTags)).from(mediaTags)
  ])

  return {
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion,
    data: {
      mediaItems: mediaItemRows,
      seasons: seasonRows,
      episodes: episodeRows,
      libraryEntries: libraryEntryRows,
      episodeProgress: episodeProgressRows,
      seasonRatings: seasonRatingRows,
      watchEvents: watchEventRows,
      tags: tagRows,
      mediaTags: mediaTagRows,
      // No settings are persisted anywhere yet — see BackupDataV2's doc comment.
      settings: {}
    }
  }
}
