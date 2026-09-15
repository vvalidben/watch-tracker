import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import initSqlJs, { type Database as SqlJsDatabase } from 'sql.js'
import { drizzle, type SQLJsDatabase } from 'drizzle-orm/sql-js'
import { migrate } from 'drizzle-orm/sql-js/migrator'
import { schema } from './schema'

export type AppDatabase = SQLJsDatabase<typeof schema>

export interface OpenDatabaseOptions {
  /** Omit for an in-memory database (used by tests). */
  filePath?: string
  migrationsFolder: string
}

export interface OpenedDatabase {
  db: AppDatabase
  /** Writes the current in-memory database out to `filePath`. No-op for in-memory databases. */
  persist: () => void
  close: () => void
}

export async function openDatabase(options: OpenDatabaseOptions): Promise<OpenedDatabase> {
  const SQL = await initSqlJs()

  const sqlJsDb: SqlJsDatabase =
    options.filePath && existsSync(options.filePath)
      ? new SQL.Database(readFileSync(options.filePath))
      : new SQL.Database()

  // SQLite disables foreign key enforcement per-connection by default;
  // without this, ON DELETE CASCADE silently does nothing.
  sqlJsDb.run('PRAGMA foreign_keys = ON;')

  const db = drizzle(sqlJsDb, { schema })

  migrate(db, { migrationsFolder: options.migrationsFolder })

  const persist = (): void => {
    if (!options.filePath) return
    const dir = dirname(options.filePath)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    writeFileSync(options.filePath, Buffer.from(sqlJsDb.export()))
  }

  // Make sure the file exists on disk (with the migrated schema) even before
  // the first write, so a fresh install has a real .db file immediately.
  persist()

  const close = (): void => {
    sqlJsDb.close()
  }

  return { db, persist, close }
}
