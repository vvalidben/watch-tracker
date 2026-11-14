/**
 * App-level configuration — distinct from personal library data (see
 * shared/backup.ts). This is machine-local operating configuration (an API
 * credential, a remembered folder) that wouldn't make sense to bundle into
 * a portable backup file: an API key is a secret you wouldn't want copied
 * into a shared export, and a remembered folder path from one computer is
 * meaningless on another.
 */
export interface AppConfigDTO {
  /** Null if no TMDB key is configured (via Settings or the TMDB_API_KEY env var). */
  tmdbApiKey: string | null
  /** True if a working TMDB key is active, whether it came from Settings or the environment. */
  tmdbConfiguredViaEnv: boolean
  /** The folder the backup save/open dialogs will start in, remembered from last use. */
  defaultBackupDirectory: string | null
}

export interface SetTmdbApiKeyRequest {
  apiKey: string | null
}

export interface DatabaseInfoDTO {
  filePath: string
  fileSizeBytes: number
  mediaItemCount: number
  libraryEntryCount: number
}

/**
 * Whether the local database is usable at all — checked once at startup
 * (see main/index.ts) before the renderer trusts any other IPC call that
 * touches it. `ok: false` means every library/dashboard/tags/statistics/
 * backup IPC handler failed to register; the renderer shows a dedicated
 * error screen instead of letting every page fail individually.
 */
export interface DatabaseStatusDTO {
  ok: boolean
  /** True if a corrupted database file was found, moved aside, and replaced with a fresh one. */
  recoveredFromCorruption: boolean
  /** Where the corrupted file was moved to, if recovery happened. */
  corruptedFilePath: string | null
  /** Only set when ok is false — why the database could not be opened at all. */
  error: string | null
  /** Where the database file lives (or would live), so an error screen can point to it even when unreadable. */
  dbPath: string
}
