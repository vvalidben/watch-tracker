import { join } from 'node:path'
import { openDatabase, type OpenedDatabase } from './client'
import { createRepositories, type Repositories } from './repositories'

/** An in-memory database migrated with the real migration files, for tests. */
export async function createTestDatabase(): Promise<OpenedDatabase> {
  const migrationsFolder = join(__dirname, '..', '..', '..', 'drizzle', 'migrations')
  return openDatabase({ migrationsFolder })
}

/** A fresh in-memory database plus repositories built against it, for tests. */
export async function createTestContext(): Promise<OpenedDatabase & { repositories: Repositories }> {
  const opened = await createTestDatabase()
  const repositories = createRepositories({ db: opened.db, persist: opened.persist })
  return { ...opened, repositories }
}
