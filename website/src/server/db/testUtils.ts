import { openLibrary } from '../database'
import { createRepositories, type Repositories } from './repositories'

/** An in-memory database migrated with the real migration files, for tests. */
export async function createTestDatabase() {
  const opened=await openLibrary()
  return {...opened,persist:opened.markDirty}
}

/** A fresh in-memory database plus repositories built against it, for tests. */
export async function createTestContext() {
  const opened = await createTestDatabase()
  const repositories = createRepositories({ db: opened.db, persist: opened.persist })
  return { ...opened, repositories }
}
