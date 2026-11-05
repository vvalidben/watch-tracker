import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

/**
 * Machine-local app configuration, stored as a small JSON file in the
 * user-data directory — separate from the SQLite database (personal watch
 * data) and separate from the .env file (developer-set defaults). A value
 * set here always wins over the equivalent environment variable.
 */
export interface AppConfig {
  tmdbApiKey: string | null
  defaultBackupDirectory: string | null
  /** Set once saved anime rows have been given their Japanese and romaji titles; restoring a backup clears it. */
  animeTitleBackfillDone?: boolean
}

const DEFAULT_CONFIG: AppConfig = { tmdbApiKey: null, defaultBackupDirectory: null }

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Never throws — a missing or corrupted config file just means "nothing configured yet." */
export function readAppConfig(filePath: string): AppConfig {
  if (!existsSync(filePath)) return { ...DEFAULT_CONFIG }
  try {
    const raw: unknown = JSON.parse(readFileSync(filePath, 'utf-8'))
    if (!isPlainObject(raw)) return { ...DEFAULT_CONFIG }
    return {
      tmdbApiKey: typeof raw.tmdbApiKey === 'string' && raw.tmdbApiKey.trim().length > 0 ? raw.tmdbApiKey : null,
      defaultBackupDirectory: typeof raw.defaultBackupDirectory === 'string' ? raw.defaultBackupDirectory : null,
      ...(raw.animeTitleBackfillDone === true ? { animeTitleBackfillDone: true } : {})
    }
  } catch {
    return { ...DEFAULT_CONFIG }
  }
}

export function writeAppConfig(filePath: string, config: AppConfig): void {
  const dir = dirname(filePath)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf-8')
}
