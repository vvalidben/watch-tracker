import { and, asc, count, desc, eq, getTableColumns, inArray, isNull, max } from 'drizzle-orm'
import type { DbContext } from '../context'
import { episodes, seasons, watchEvents } from '../schema'
import type { WatchEvent } from '../types'

const columns = getTableColumns(watchEvents)

export interface RecentWatchEvent {
  mediaItemId: number
  episodeId: number | null
  watchedAt: string
}

export interface WatchLogEvent {
  mediaItemId: number
  watchedAt: string
  seasonNumber: number | null
  episodeNumber: number | null
}

/**
 * Append-only: every method here either inserts a new row or reads existing
 * ones. Nothing updates or deletes a watch_events row (see schema.ts) — that
 * invariant is what keeps rewatch history from being destroyed when
 * something is later marked unwatched.
 */
export function createWatchEventsRepository({ db, persist }: DbContext) {
  return {
    async record(mediaItemId: number, episodeId: number | null, watchedAt: string): Promise<WatchEvent> {
      const [row] = await db.insert(watchEvents).values({ mediaItemId, episodeId, watchedAt }).returning()
      persist()
      return row
    },

    /** Bulk counterpart for "mark season/series watched" — one insert, one persist(), not N. */
    async recordMany(mediaItemId: number, episodeIds: number[], watchedAt: string): Promise<void> {
      if (episodeIds.length === 0) return
      await db.insert(watchEvents).values(episodeIds.map((episodeId) => ({ mediaItemId, episodeId, watchedAt })))
      persist()
    },

    /** Full watch history for one episode, oldest first — "Episode 5: Watched: 2026-01-10, 2026-06-12". */
    async listForEpisode(episodeId: number): Promise<WatchEvent[]> {
      return db.select(columns).from(watchEvents).where(eq(watchEvents.episodeId, episodeId)).orderBy(asc(watchEvents.watchedAt))
    },

    /** Full watch history for one movie, oldest first. */
    async listForMovie(mediaItemId: number): Promise<WatchEvent[]> {
      return db
        .select(columns)
        .from(watchEvents)
        .where(and(eq(watchEvents.mediaItemId, mediaItemId), isNull(watchEvents.episodeId)))
        .orderBy(asc(watchEvents.watchedAt))
    },

    async countForEpisode(episodeId: number): Promise<number> {
      const [row] = await db.select({ value: count() }).from(watchEvents).where(eq(watchEvents.episodeId, episodeId))
      return row?.value ?? 0
    },

    async countForMovie(mediaItemId: number): Promise<number> {
      const [row] = await db
        .select({ value: count() })
        .from(watchEvents)
        .where(and(eq(watchEvents.mediaItemId, mediaItemId), isNull(watchEvents.episodeId)))
      return row?.value ?? 0
    },

    /** How many times each of these episodes has been watched — one grouped query for a whole season's episode list. */
    async getWatchCountsByEpisodeIds(episodeIds: number[]): Promise<Map<number, number>> {
      if (episodeIds.length === 0) return new Map()
      const rows = await db
        .select({ episodeId: watchEvents.episodeId, value: count() })
        .from(watchEvents)
        .where(inArray(watchEvents.episodeId, episodeIds))
        .groupBy(watchEvents.episodeId)
      return new Map(rows.filter((row) => row.episodeId !== null).map((row) => [row.episodeId as number, row.value]))
    },

    /**
     * Most recent watch (movie or episode) per media item, across every
     * event ever recorded — the true source for "recently watched," robust
     * to unwatch/rewatch cycles in a way a single cached field can't be.
     */
    async getLastWatchedByMediaItemIds(mediaItemIds: number[]): Promise<Map<number, string>> {
      if (mediaItemIds.length === 0) return new Map()
      const rows = await db
        .select({ mediaItemId: watchEvents.mediaItemId, lastWatchedAt: max(watchEvents.watchedAt) })
        .from(watchEvents)
        .where(inArray(watchEvents.mediaItemId, mediaItemIds))
        .groupBy(watchEvents.mediaItemId)
      return new Map(rows.filter((row) => row.lastWatchedAt !== null).map((row) => [row.mediaItemId, row.lastWatchedAt as string]))
    },

    /** The N most recent watch events across the given media items, newest first — for a global "recently watched" feed. */
    async listRecentForMediaItems(mediaItemIds: number[], limit: number): Promise<RecentWatchEvent[]> {
      if (mediaItemIds.length === 0) return []
      return db
        .select({ mediaItemId: watchEvents.mediaItemId, episodeId: watchEvents.episodeId, watchedAt: watchEvents.watchedAt })
        .from(watchEvents)
        .where(inArray(watchEvents.mediaItemId, mediaItemIds))
        .orderBy(desc(watchEvents.watchedAt))
        .limit(limit)
    },

    /**
     * Every watch event for the given media items, unfiltered by date or
     * count — for the Statistics page's monthly trend charts, which need
     * the full set to bucket by month themselves. Scoping to a caller-given
     * set of media item ids (rather than "all events ever") is what keeps
     * statistics correct after a title is removed from the library: the
     * caller passes only currently-libraried ids.
     */
    async listAllForMediaItems(mediaItemIds: number[]): Promise<RecentWatchEvent[]> {
      if (mediaItemIds.length === 0) return []
      return db
        .select({ mediaItemId: watchEvents.mediaItemId, episodeId: watchEvents.episodeId, watchedAt: watchEvents.watchedAt })
        .from(watchEvents)
        .where(inArray(watchEvents.mediaItemId, mediaItemIds))
    },

    /**
     * Every watch event for the given media items, newest first, resolved to
     * season and episode numbers for the Watch log. A bulk "mark season
     * watched" gives many events one timestamp, so the secondary ordering is
     * what keeps those in a sensible order.
     */
    async listLogForMediaItems(mediaItemIds: number[]): Promise<WatchLogEvent[]> {
      if (mediaItemIds.length === 0) return []
      return db
        .select({
          mediaItemId: watchEvents.mediaItemId,
          watchedAt: watchEvents.watchedAt,
          seasonNumber: seasons.seasonNumber,
          episodeNumber: episodes.episodeNumber
        })
        .from(watchEvents)
        .leftJoin(episodes, eq(watchEvents.episodeId, episodes.id))
        .leftJoin(seasons, eq(episodes.seasonId, seasons.id))
        .where(inArray(watchEvents.mediaItemId, mediaItemIds))
        .orderBy(desc(watchEvents.watchedAt), desc(seasons.seasonNumber), desc(episodes.episodeNumber))
    }
  }
}

export type WatchEventsRepository = ReturnType<typeof createWatchEventsRepository>
