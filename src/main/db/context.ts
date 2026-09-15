import type { AppDatabase } from './client'

/**
 * Everything a repository needs: the query interface, and a way to flush the
 * in-memory sql.js database to disk after a mutation. Bundled together so
 * repository factories take one argument instead of two.
 */
export interface DbContext {
  db: AppDatabase
  persist: () => void
}
