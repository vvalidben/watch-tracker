/**
 * The local backup file format. Deliberately its own frozen set of
 * interfaces rather than whatever `src/main/db/types.ts` happens to infer
 * from the live Drizzle schema — that's what "versioned" means here: the
 * on-disk database schema can evolve freely, and each time it does in a way
 * that affects personal data, this file gains a new `BackupFileVN` shape
 * plus a `migrateVNToVN+1` function, while every *older* exported backup
 * keeps loading correctly forever via the migration chain in
 * `parseBackupFile`.
 */

export const BACKUP_FORMAT_VERSION = 2

// ============================================================================
// V1 — the original shape: core library data, no tags, no watch history
// ledger, no settings section. (This app's own schema grew tags/watch_events
// after its first sprints — V1 documents what a backup taken at that point
// would have looked like.)
// ============================================================================

export type BackupMediaType = 'movie' | 'tv' | 'anime'
export type BackupMediaSource = 'tmdb' | 'anilist' | 'manual'
export type BackupAiringStatus = 'airing' | 'finished' | 'upcoming' | 'cancelled'
export type BackupWatchStatus = 'plan_to_watch' | 'watching' | 'completed' | 'on_hold' | 'dropped'

export interface BackupMediaItem {
  id: number
  type: BackupMediaType
  title: string
  originalTitle: string | null
  overview: string | null
  posterPath: string | null
  backdropPath: string | null
  releaseDate: string | null
  airingStatus: BackupAiringStatus | null
  runtimeMinutes: number | null
  numberOfSeasons: number | null
  numberOfEpisodes: number | null
  genres: string[] | null
  source: BackupMediaSource
  sourceId: string | null
  externalIds: Record<string, string> | null
  createdAt: string
  updatedAt: string
}

export interface BackupSeason {
  id: number
  mediaItemId: number
  seasonNumber: number
  title: string | null
  overview: string | null
  posterPath: string | null
  airDate: string | null
}

export interface BackupEpisode {
  id: number
  seasonId: number
  episodeNumber: number
  title: string | null
  overview: string | null
  airDate: string | null
  runtimeMinutes: number | null
}

export interface BackupLibraryEntry {
  id: number
  mediaItemId: number
  watchStatus: BackupWatchStatus
  rating: number | null
  favorite: boolean
  notes: string | null
  rewatchCount: number
  addedAt: string
  startedAt: string | null
  completedAt: string | null
  updatedAt: string
}

export interface BackupEpisodeProgress {
  id: number
  episodeId: number
  watched: boolean
  watchedAt: string | null
  rating: number | null
  notes: string | null
  updatedAt: string
}

export interface BackupDataV1 {
  mediaItems: BackupMediaItem[]
  seasons: BackupSeason[]
  episodes: BackupEpisode[]
  libraryEntries: BackupLibraryEntry[]
  episodeProgress: BackupEpisodeProgress[]
}

export interface BackupFileV1 {
  formatVersion: 1
  exportedAt: string
  appVersion: string
  data: BackupDataV1
}

// ============================================================================
// V2 (current) — adds season ratings/notes, the watch-history ledger, tags,
// and a reserved settings section.
// ============================================================================

export interface BackupSeasonRating {
  id: number
  seasonId: number
  rating: number | null
  notes: string | null
  updatedAt: string
}

export interface BackupWatchEvent {
  id: number
  mediaItemId: number
  /** null for a movie-level watch event. */
  episodeId: number | null
  watchedAt: string
}

export interface BackupTag {
  id: number
  name: string
  color: string | null
  createdAt: string
}

export interface BackupMediaTag {
  mediaItemId: number
  tagId: number
}

export interface BackupDataV2 extends BackupDataV1 {
  seasonRatings: BackupSeasonRating[]
  watchEvents: BackupWatchEvent[]
  tags: BackupTag[]
  mediaTags: BackupMediaTag[]
  /**
   * Reserved for app-level preferences (there are none persisted yet, so
   * this is always `{}` today) — present now so a future settings store
   * doesn't need another format bump just to be included in backups.
   */
  settings: Record<string, unknown>
}

export interface BackupFileV2 {
  formatVersion: 2
  exportedAt: string
  appVersion: string
  data: BackupDataV2
}

export type LatestBackupData = BackupDataV2
export type LatestBackupFile = BackupFileV2

// ============================================================================
// Validation helpers — hand-written rather than pulling in a schema library,
// consistent with the rest of this app's "no dependency for what a dozen
// lines of TypeScript already do" approach.
// ============================================================================

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isStringOrNull(value: unknown): value is string | null {
  return value === null || typeof value === 'string'
}

function isNumberOrNull(value: unknown): value is number | null {
  return value === null || typeof value === 'number'
}

function isStringArrayOrNull(value: unknown): value is string[] | null {
  return value === null || (Array.isArray(value) && value.every((entry) => typeof entry === 'string'))
}

function isStringRecordOrNull(value: unknown): value is Record<string, string> | null {
  return value === null || (isPlainObject(value) && Object.values(value).every((entry) => typeof entry === 'string'))
}

export interface BackupParseFailure {
  ok: false
  error: string
}

export interface BackupParseSuccess {
  ok: true
  backup: LatestBackupFile
}

export type BackupParseResult = BackupParseSuccess | BackupParseFailure

function fail(error: string): BackupParseFailure {
  return { ok: false, error }
}

function validateRows<T>(
  value: unknown,
  tableName: string,
  isValidRow: (row: unknown, index: number) => string | null
): { ok: true; rows: T[] } | BackupParseFailure {
  if (!Array.isArray(value)) return fail(`Backup data.${tableName} must be an array.`)
  for (let index = 0; index < value.length; index++) {
    const rowError = isValidRow(value[index], index)
    if (rowError) return fail(`Backup data.${tableName}[${index}] is invalid: ${rowError}`)
  }
  return { ok: true, rows: value as T[] }
}

function mediaItemRowError(row: unknown): string | null {
  if (!isPlainObject(row)) return 'not an object'
  if (typeof row.id !== 'number') return 'id must be a number'
  if (row.type !== 'movie' && row.type !== 'tv' && row.type !== 'anime') return 'invalid type'
  if (typeof row.title !== 'string') return 'title must be a string'
  if (!isStringOrNull(row.originalTitle)) return 'originalTitle must be a string or null'
  if (row.source !== 'tmdb' && row.source !== 'anilist' && row.source !== 'manual') return 'invalid source'
  if (!isStringOrNull(row.sourceId)) return 'sourceId must be a string or null'
  if (!isStringArrayOrNull(row.genres)) return 'genres must be a string array or null'
  if (!isStringRecordOrNull(row.externalIds)) return 'externalIds must be a string record or null'
  if (typeof row.createdAt !== 'string') return 'createdAt must be a string'
  if (typeof row.updatedAt !== 'string') return 'updatedAt must be a string'
  return null
}

function seasonRowError(row: unknown): string | null {
  if (!isPlainObject(row)) return 'not an object'
  if (typeof row.id !== 'number') return 'id must be a number'
  if (typeof row.mediaItemId !== 'number') return 'mediaItemId must be a number'
  if (typeof row.seasonNumber !== 'number') return 'seasonNumber must be a number'
  return null
}

function episodeRowError(row: unknown): string | null {
  if (!isPlainObject(row)) return 'not an object'
  if (typeof row.id !== 'number') return 'id must be a number'
  if (typeof row.seasonId !== 'number') return 'seasonId must be a number'
  if (typeof row.episodeNumber !== 'number') return 'episodeNumber must be a number'
  return null
}

function libraryEntryRowError(row: unknown): string | null {
  if (!isPlainObject(row)) return 'not an object'
  if (typeof row.id !== 'number') return 'id must be a number'
  if (typeof row.mediaItemId !== 'number') return 'mediaItemId must be a number'
  const validStatuses: BackupWatchStatus[] = ['plan_to_watch', 'watching', 'completed', 'on_hold', 'dropped']
  if (!validStatuses.includes(row.watchStatus as BackupWatchStatus)) return 'invalid watchStatus'
  if (!isNumberOrNull(row.rating)) return 'rating must be a number or null'
  if (typeof row.favorite !== 'boolean') return 'favorite must be a boolean'
  if (typeof row.addedAt !== 'string') return 'addedAt must be a string'
  return null
}

function episodeProgressRowError(row: unknown): string | null {
  if (!isPlainObject(row)) return 'not an object'
  if (typeof row.id !== 'number') return 'id must be a number'
  if (typeof row.episodeId !== 'number') return 'episodeId must be a number'
  if (typeof row.watched !== 'boolean') return 'watched must be a boolean'
  if (!isNumberOrNull(row.rating)) return 'rating must be a number or null'
  return null
}

function seasonRatingRowError(row: unknown): string | null {
  if (!isPlainObject(row)) return 'not an object'
  if (typeof row.id !== 'number') return 'id must be a number'
  if (typeof row.seasonId !== 'number') return 'seasonId must be a number'
  if (!isNumberOrNull(row.rating)) return 'rating must be a number or null'
  return null
}

function watchEventRowError(row: unknown): string | null {
  if (!isPlainObject(row)) return 'not an object'
  if (typeof row.id !== 'number') return 'id must be a number'
  if (typeof row.mediaItemId !== 'number') return 'mediaItemId must be a number'
  if (row.episodeId !== null && typeof row.episodeId !== 'number') return 'episodeId must be a number or null'
  if (typeof row.watchedAt !== 'string') return 'watchedAt must be a string'
  return null
}

function tagRowError(row: unknown): string | null {
  if (!isPlainObject(row)) return 'not an object'
  if (typeof row.id !== 'number') return 'id must be a number'
  if (typeof row.name !== 'string') return 'name must be a string'
  return null
}

function mediaTagRowError(row: unknown): string | null {
  if (!isPlainObject(row)) return 'not an object'
  if (typeof row.mediaItemId !== 'number') return 'mediaItemId must be a number'
  if (typeof row.tagId !== 'number') return 'tagId must be a number'
  return null
}

/** Validates the five tables every backup version has had since V1. */
function validateCoreData(data: Record<string, unknown>): { ok: true; core: BackupDataV1 } | BackupParseFailure {
  const mediaItems = validateRows<BackupMediaItem>(data.mediaItems, 'mediaItems', mediaItemRowError)
  if (!mediaItems.ok) return mediaItems
  const seasons = validateRows<BackupSeason>(data.seasons, 'seasons', seasonRowError)
  if (!seasons.ok) return seasons
  const episodes = validateRows<BackupEpisode>(data.episodes, 'episodes', episodeRowError)
  if (!episodes.ok) return episodes
  const libraryEntries = validateRows<BackupLibraryEntry>(data.libraryEntries, 'libraryEntries', libraryEntryRowError)
  if (!libraryEntries.ok) return libraryEntries
  const episodeProgress = validateRows<BackupEpisodeProgress>(
    data.episodeProgress,
    'episodeProgress',
    episodeProgressRowError
  )
  if (!episodeProgress.ok) return episodeProgress

  return {
    ok: true,
    core: {
      mediaItems: mediaItems.rows,
      seasons: seasons.rows,
      episodes: episodes.rows,
      libraryEntries: libraryEntries.rows,
      episodeProgress: episodeProgress.rows
    }
  }
}

function validateV1Shape(raw: Record<string, unknown>): { ok: true; backup: BackupFileV1 } | BackupParseFailure {
  const core = validateCoreData(raw.data as Record<string, unknown>)
  if (!core.ok) return core
  return {
    ok: true,
    backup: {
      formatVersion: 1,
      exportedAt: raw.exportedAt as string,
      appVersion: typeof raw.appVersion === 'string' ? raw.appVersion : 'unknown',
      data: core.core
    }
  }
}

function validateV2Shape(raw: Record<string, unknown>): BackupParseResult {
  const data = raw.data as Record<string, unknown>
  const core = validateCoreData(data)
  if (!core.ok) return core

  const seasonRatings = validateRows<BackupSeasonRating>(data.seasonRatings, 'seasonRatings', seasonRatingRowError)
  if (!seasonRatings.ok) return seasonRatings
  const watchEvents = validateRows<BackupWatchEvent>(data.watchEvents, 'watchEvents', watchEventRowError)
  if (!watchEvents.ok) return watchEvents
  const tags = validateRows<BackupTag>(data.tags, 'tags', tagRowError)
  if (!tags.ok) return tags
  const mediaTags = validateRows<BackupMediaTag>(data.mediaTags, 'mediaTags', mediaTagRowError)
  if (!mediaTags.ok) return mediaTags
  if (!isPlainObject(data.settings)) return fail('Backup data.settings must be an object.')

  const backup: LatestBackupFile = {
    formatVersion: 2,
    exportedAt: raw.exportedAt as string,
    appVersion: typeof raw.appVersion === 'string' ? raw.appVersion : 'unknown',
    data: {
      ...core.core,
      seasonRatings: seasonRatings.rows,
      watchEvents: watchEvents.rows,
      tags: tags.rows,
      mediaTags: mediaTags.rows,
      settings: data.settings
    }
  }

  const referentialError = validateReferentialIntegrity(backup.data)
  if (referentialError) return fail(referentialError)

  return { ok: true, backup }
}

/** Upgrades a V1 backup by defaulting every table introduced in V2 to empty. */
export function migrateV1ToV2(v1: BackupFileV1): BackupFileV2 {
  return {
    formatVersion: 2,
    exportedAt: v1.exportedAt,
    appVersion: v1.appVersion,
    data: {
      ...v1.data,
      seasonRatings: [],
      watchEvents: [],
      tags: [],
      mediaTags: [],
      settings: {}
    }
  }
}

function duplicateIdError(ids: number[], tableName: string): string | null {
  const seen = new Set<number>()
  for (const id of ids) {
    if (seen.has(id)) return `Backup data.${tableName} has a duplicate id: ${id}.`
    seen.add(id)
  }
  return null
}

function danglingReferenceError(
  refs: readonly (number | null)[],
  validIds: ReadonlySet<number>,
  fromTable: string,
  toTable: string
): string | null {
  for (const ref of refs) {
    if (ref !== null && !validIds.has(ref)) {
      return `Backup data.${fromTable} references ${toTable} id ${ref}, which does not exist in this backup.`
    }
  }
  return null
}

/**
 * Catches a corrupted or hand-edited backup that would otherwise only fail
 * midway through restoring (as a foreign-key constraint violation), by
 * checking every id is unique and every reference resolves — entirely
 * before anything is written to the database.
 */
function validateReferentialIntegrity(data: BackupDataV2): string | null {
  const mediaItemIds = new Set(data.mediaItems.map((row) => row.id))
  const seasonIds = new Set(data.seasons.map((row) => row.id))
  const episodeIds = new Set(data.episodes.map((row) => row.id))
  const tagIds = new Set(data.tags.map((row) => row.id))

  return (
    duplicateIdError(data.mediaItems.map((r) => r.id), 'mediaItems') ??
    duplicateIdError(data.seasons.map((r) => r.id), 'seasons') ??
    duplicateIdError(data.episodes.map((r) => r.id), 'episodes') ??
    duplicateIdError(data.libraryEntries.map((r) => r.id), 'libraryEntries') ??
    duplicateIdError(data.episodeProgress.map((r) => r.id), 'episodeProgress') ??
    duplicateIdError(data.seasonRatings.map((r) => r.id), 'seasonRatings') ??
    duplicateIdError(data.watchEvents.map((r) => r.id), 'watchEvents') ??
    duplicateIdError(data.tags.map((r) => r.id), 'tags') ??
    danglingReferenceError(data.seasons.map((r) => r.mediaItemId), mediaItemIds, 'seasons', 'mediaItems') ??
    danglingReferenceError(data.episodes.map((r) => r.seasonId), seasonIds, 'episodes', 'seasons') ??
    danglingReferenceError(data.libraryEntries.map((r) => r.mediaItemId), mediaItemIds, 'libraryEntries', 'mediaItems') ??
    danglingReferenceError(data.episodeProgress.map((r) => r.episodeId), episodeIds, 'episodeProgress', 'episodes') ??
    danglingReferenceError(data.seasonRatings.map((r) => r.seasonId), seasonIds, 'seasonRatings', 'seasons') ??
    danglingReferenceError(data.watchEvents.map((r) => r.mediaItemId), mediaItemIds, 'watchEvents', 'mediaItems') ??
    danglingReferenceError(data.watchEvents.map((r) => r.episodeId), episodeIds, 'watchEvents', 'episodes') ??
    danglingReferenceError(data.mediaTags.map((r) => r.mediaItemId), mediaItemIds, 'mediaTags', 'mediaItems') ??
    danglingReferenceError(data.mediaTags.map((r) => r.tagId), tagIds, 'mediaTags', 'tags') ??
    null
  )
}

/**
 * The one entry point for reading a backup file: validates its shape,
 * migrates it forward to the current format if it's an older version, then
 * validates the fully-migrated result (including cross-table references)
 * before ever touching the database. Never throws — every failure mode
 * (malformed JSON structure, unknown/future version, corrupted references)
 * comes back as `{ ok: false, error }` with a message a user could act on.
 */
export function parseBackupFile(raw: unknown): BackupParseResult {
  if (!isPlainObject(raw)) return fail('Backup file is not a valid JSON object.')

  const formatVersion = raw.formatVersion
  if (typeof formatVersion !== 'number' || !Number.isInteger(formatVersion) || formatVersion < 1) {
    return fail('Backup file is missing a valid formatVersion.')
  }
  if (formatVersion > BACKUP_FORMAT_VERSION) {
    return fail(
      `This backup was created by a newer version of the app (format v${formatVersion}) than this version supports (v${BACKUP_FORMAT_VERSION}). Update the app before restoring it.`
    )
  }
  if (typeof raw.exportedAt !== 'string') {
    return fail('Backup file is missing exportedAt.')
  }
  if (!isPlainObject(raw.data)) {
    return fail('Backup file is missing its data section.')
  }

  if (formatVersion === 1) {
    const v1 = validateV1Shape(raw)
    if (!v1.ok) return v1
    return validateV2Shape({ ...raw, data: migrateV1ToV2(v1.backup).data, formatVersion: 2 })
  }

  if (formatVersion === 2) {
    return validateV2Shape(raw)
  }

  return fail(`Unsupported backup format version: ${formatVersion}`)
}

// ============================================================================
// IPC contract — the renderer never touches the filesystem directly; it
// asks the main process to show the native save/open dialog and do the
// actual export/restore, and gets one of these back.
// ============================================================================

export interface ExportBackupResult {
  /** True if the user closed the save dialog without picking a location — not an error. */
  cancelled: boolean
  filePath: string | null
}

export interface ImportBackupResult {
  /** True if the user closed the open dialog, or declined the "this replaces everything" confirmation. */
  cancelled: boolean
  /** True once the restore has succeeded and the app is about to relaunch to load it. */
  restarting: boolean
  /** The backup's own exportedAt, surfaced so the confirmation UI can say what it's about to restore. */
  exportedAt: string | null
}
