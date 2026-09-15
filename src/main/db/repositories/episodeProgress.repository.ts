import { and, count, eq, getTableColumns, inArray, max } from 'drizzle-orm'
import type { DbContext } from '../context'
import { firstOf } from '../queryHelpers'
import { episodeProgress, episodes, seasons } from '../schema'
import type { EpisodeProgress, NewEpisodeProgress } from '../types'
import { assertValidRating } from '../validation'

type ProgressChanges = Partial<Omit<NewEpisodeProgress, 'id' | 'episodeId'>>

export interface WatchedSummary {
  watchedCount: number
  lastWatchedAt: string | null
}

const columns = getTableColumns(episodeProgress)

export function createEpisodeProgressRepository({ db, persist }: DbContext) {
  async function upsert(episodeId: number, changes: ProgressChanges): Promise<EpisodeProgress> {
    const now = new Date().toISOString()
    const [row] = await db
      .insert(episodeProgress)
      .values({ episodeId, updatedAt: now, ...changes })
      .onConflictDoUpdate({
        target: episodeProgress.episodeId,
        set: { ...changes, updatedAt: now }
      })
      .returning()
    persist()
    return row
  }

  return {
    async getByEpisodeId(episodeId: number): Promise<EpisodeProgress | undefined> {
      return firstOf(
        db.select(columns).from(episodeProgress).where(eq(episodeProgress.episodeId, episodeId)).limit(1)
      )
    },

    async markWatched(episodeId: number, watchedAt: string = new Date().toISOString()): Promise<EpisodeProgress> {
      return upsert(episodeId, { watched: true, watchedAt })
    },

    /**
     * Flips the current-state flag only. `watchedAt` is deliberately left
     * alone — it means "most recently watched at," a historical fact that
     * stays true even after the episode is unwatched. The full history of
     * every watch (for rewatches) lives in watch_events, never here.
     */
    async markUnwatched(episodeId: number): Promise<EpisodeProgress> {
      return upsert(episodeId, { watched: false })
    },

    async rate(episodeId: number, rating: number | null): Promise<EpisodeProgress> {
      assertValidRating(rating)
      return upsert(episodeId, { rating })
    },

    async setNotes(episodeId: number, notes: string | null): Promise<EpisodeProgress> {
      return upsert(episodeId, { notes })
    },

    /**
     * Bulk watched/unwatched for "mark season watched" / "mark series
     * watched". One multi-row upsert statement and one persist() call,
     * rather than looping the single-episode path — matters once a season
     * or series runs into the dozens/hundreds of episodes.
     *
     * Unwatching never touches `watchedAt` (same reasoning as
     * markUnwatched) — it's left out of the update `set` entirely so the
     * conflict branch leaves the existing value in place. A brand-new row
     * being bulk-unwatched (never touched before) still gets watchedAt:
     * null via the insert `values`, since there's no prior watch to record.
     */
    async setManyWatched(episodeIds: number[], watched: boolean): Promise<void> {
      if (episodeIds.length === 0) return
      const now = new Date().toISOString()
      const watchedAt = watched ? now : null
      await db
        .insert(episodeProgress)
        .values(episodeIds.map((episodeId) => ({ episodeId, watched, watchedAt, updatedAt: now })))
        .onConflictDoUpdate({
          target: episodeProgress.episodeId,
          set: watched ? { watched, watchedAt, updatedAt: now } : { watched, updatedAt: now }
        })
      persist()
    },

    /**
     * For the Library page: how many episodes are watched (and when the
     * most recent one was) for each of the given media items, in a single
     * grouped query rather than one query per row — this is what keeps
     * rendering a whole library grid fast and entirely local.
     */
    async getWatchedSummaryByMediaItemIds(mediaItemIds: number[]): Promise<Map<number, WatchedSummary>> {
      if (mediaItemIds.length === 0) return new Map()

      const rows = await db
        .select({
          mediaItemId: seasons.mediaItemId,
          watchedCount: count(),
          lastWatchedAt: max(episodeProgress.watchedAt)
        })
        .from(episodeProgress)
        .innerJoin(episodes, eq(episodes.id, episodeProgress.episodeId))
        .innerJoin(seasons, eq(seasons.id, episodes.seasonId))
        .where(and(inArray(seasons.mediaItemId, mediaItemIds), eq(episodeProgress.watched, true)))
        .groupBy(seasons.mediaItemId)

      return new Map(rows.map((row) => [row.mediaItemId, { watchedCount: row.watchedCount, lastWatchedAt: row.lastWatchedAt }]))
    },

    /**
     * Watched-episode counts per season for one title, in a single grouped
     * query. Replaces what used to be "list this title's seasons, then run
     * a separate watched-episodes query per season" — an N+1 pattern that
     * cost 1 + 2*N queries for an N-season series every time series
     * progress was computed (every MediaDetail load, and after every
     * episode watched/unwatched toggle).
     */
    async getWatchedCountsBySeasonNumber(mediaItemId: number): Promise<Map<number, number>> {
      const rows = await db
        .select({ seasonNumber: seasons.seasonNumber, value: count() })
        .from(episodeProgress)
        .innerJoin(episodes, eq(episodes.id, episodeProgress.episodeId))
        .innerJoin(seasons, eq(seasons.id, episodes.seasonId))
        .where(and(eq(seasons.mediaItemId, mediaItemId), eq(episodeProgress.watched, true)))
        .groupBy(seasons.seasonNumber)

      return new Map(rows.map((row) => [row.seasonNumber, row.value]))
    }
  }
}

export type EpisodeProgressRepository = ReturnType<typeof createEpisodeProgressRepository>
