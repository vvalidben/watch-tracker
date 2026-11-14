import type { DbContext } from '../context'
import { createEpisodeProgressRepository } from './episodeProgress.repository'
import { createEpisodesRepository } from './episodes.repository'
import { createLibraryEntriesRepository } from './libraryEntries.repository'
import { createMediaItemsRepository } from './mediaItems.repository'
import { createSeasonRatingsRepository } from './seasonRatings.repository'
import { createSeasonsRepository } from './seasons.repository'
import { createTagsRepository } from './tags.repository'
import { createWatchEventsRepository } from './watchEvents.repository'
import { AsyncLocalStorage } from 'node:async_hooks'
import { sql } from 'drizzle-orm'

export function createRepositories(context: DbContext) {
  // sql.js has one connection. Serialize callers so an async multi-step transaction
  // cannot accidentally include another IPC request's writes.
  const owner = new AsyncLocalStorage<boolean>()
  let queue: Promise<unknown> = Promise.resolve()
  let inTransaction = false
  function exclusive<T>(action: () => Promise<T>): Promise<T> {
    if (owner.getStore()) return action()
    const result = queue.then(() => owner.run(true, action))
    queue = result.catch(() => undefined)
    return result
  }
  const bufferedContext: DbContext = { db: context.db, persist: () => { if (!inTransaction) context.persist() } }
  function wrap<T extends object>(repository: T): T {
    return new Proxy(repository, { get(target, key, receiver) {
      const method = Reflect.get(target, key, receiver)
      return typeof method === 'function' ? (...args: unknown[]) => exclusive(() => Reflect.apply(method, target, args)) : method
    } })
  }
  return {
    mediaItems: wrap(createMediaItemsRepository(bufferedContext)),
    seasons: wrap(createSeasonsRepository(bufferedContext)),
    episodes: wrap(createEpisodesRepository(bufferedContext)),
    libraryEntries: wrap(createLibraryEntriesRepository(bufferedContext)),
    episodeProgress: wrap(createEpisodeProgressRepository(bufferedContext)),
    watchEvents: wrap(createWatchEventsRepository(bufferedContext)),
    seasonRatings: wrap(createSeasonRatingsRepository(bufferedContext)),
    tags: wrap(createTagsRepository(bufferedContext)),
    readSnapshot<T>(action: () => Promise<T>): Promise<T> {
      return exclusive(action)
    },
    transaction<T>(action: () => Promise<T>): Promise<T> {
      return exclusive(async () => {
        if (inTransaction) return action()
        context.db.run(sql`BEGIN IMMEDIATE`)
        inTransaction = true
        let committed = false
        try {
          const result = await action()
          context.db.run(sql`COMMIT`)
          committed = true
          inTransaction = false
          context.persist()
          return result
        } catch (error) {
          if (!committed) context.db.run(sql`ROLLBACK`)
          throw error
        } finally { inTransaction = false }
      })
    }
  }
}

export type Repositories = ReturnType<typeof createRepositories>

export * from './episodeProgress.repository'
export * from './episodes.repository'
export * from './libraryEntries.repository'
export * from './mediaItems.repository'
export * from './seasonRatings.repository'
export * from './seasons.repository'
export * from './tags.repository'
export * from './watchEvents.repository'
