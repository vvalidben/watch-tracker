import { and, eq, getTableColumns, inArray, like, or } from 'drizzle-orm'
import type { DbContext } from '../context'
import { firstOf } from '../queryHelpers'
import { libraryEntries, mediaItems } from '../schema'
import type { LibraryEntry, LibraryEntryWithMedia, MediaType, NewLibraryEntry, WatchStatus } from '../types'
import { assertValidRating } from '../validation'

export interface LibraryViewFilter {
  watchStatus?: WatchStatus
  favorite?: boolean
  type?: MediaType
  /** Matches against title/originalTitle. SQLite's LIKE is already case-insensitive for ASCII. */
  search?: string
  /** Restricts to these media items — used for the tag filter (resolved to ids by the caller). */
  mediaItemIds?: number[]
}

const entryColumns = getTableColumns(libraryEntries)
const mediaItemColumns = getTableColumns(mediaItems)

export class DuplicateLibraryEntryError extends Error {
  constructor(mediaItemId: number) {
    super(`Media item ${mediaItemId} is already in the library`)
    this.name = 'DuplicateLibraryEntryError'
  }
}

export interface AddToLibraryInput {
  mediaItemId: number
  watchStatus?: WatchStatus
  rating?: number | null
  favorite?: boolean
  notes?: string | null
}

export interface LibraryEntryFilter {
  watchStatus?: WatchStatus
  favorite?: boolean
}

export function createLibraryEntriesRepository({ db, persist }: DbContext) {
  function buildFilter(filter?: LibraryEntryFilter) {
    const conditions = []
    if (filter?.watchStatus) conditions.push(eq(libraryEntries.watchStatus, filter.watchStatus))
    if (filter?.favorite !== undefined) conditions.push(eq(libraryEntries.favorite, filter.favorite))
    return conditions.length ? and(...conditions) : undefined
  }

  async function getByIdRaw(id: number): Promise<LibraryEntry | undefined> {
    return firstOf(db.select(entryColumns).from(libraryEntries).where(eq(libraryEntries.id, id)).limit(1))
  }

  return {
    async add(input: AddToLibraryInput): Promise<LibraryEntry> {
      assertValidRating(input.rating)

      const existing = await firstOf(
        db
          .select(entryColumns)
          .from(libraryEntries)
          .where(eq(libraryEntries.mediaItemId, input.mediaItemId))
          .limit(1)
      )
      if (existing) throw new DuplicateLibraryEntryError(input.mediaItemId)

      const now = new Date().toISOString()
      const [row] = await db
        .insert(libraryEntries)
        .values({
          mediaItemId: input.mediaItemId,
          watchStatus: input.watchStatus ?? 'plan_to_watch',
          rating: input.rating ?? null,
          favorite: input.favorite ?? false,
          notes: input.notes ?? null,
          rewatchCount: 0,
          addedAt: now,
          updatedAt: now
        })
        .returning()
      persist()
      return row
    },

    getById: getByIdRaw,

    async getByMediaItemId(mediaItemId: number): Promise<LibraryEntry | undefined> {
      return firstOf(
        db
          .select(entryColumns)
          .from(libraryEntries)
          .where(eq(libraryEntries.mediaItemId, mediaItemId))
          .limit(1)
      )
    },

    async list(filter?: LibraryEntryFilter): Promise<LibraryEntry[]> {
      const where = buildFilter(filter)
      const query = db.select(entryColumns).from(libraryEntries)
      return where ? query.where(where) : query
    },

    /** Library entries joined with their media item — what the Library page will render. */
    async listWithMedia(filter?: LibraryEntryFilter): Promise<LibraryEntryWithMedia[]> {
      const where = buildFilter(filter)
      const query = db.select(entryColumns).from(libraryEntries)
      const entries = await (where ? query.where(where) : query)
      if (entries.length === 0) return []

      const mediaItemIds = entries.map((entry) => entry.mediaItemId)
      const mediaRows = await db
        .select(mediaItemColumns)
        .from(mediaItems)
        .where(inArray(mediaItems.id, mediaItemIds))
      const mediaById = new Map(mediaRows.map((item) => [item.id, item]))

      return entries.map((entry) => {
        const mediaItem = mediaById.get(entry.mediaItemId)
        if (!mediaItem) {
          throw new Error(`Library entry ${entry.id} has no matching media item ${entry.mediaItemId}`)
        }
        return { ...entry, mediaItem }
      })
    },

    /**
     * The Library page's read: filters at the SQL level (status, favorite,
     * media type, and a title search) via a single JOIN query — the part
     * that actually matters for "fast, local-only" as the library grows.
     * Sorting is deliberately left to the caller: several requested sorts
     * (recently watched, ratings with nulls sorted last) need data this
     * query doesn't have, so it's simplest to sort the whole thing once in
     * one place after merging in progress/rating-rollup data.
     */
    async listLibraryView(filter: LibraryViewFilter): Promise<LibraryEntryWithMedia[]> {
      // An empty match set (e.g. a tag with no items) means "nothing
      // qualifies" — short-circuit rather than pass an empty inArray(),
      // which some SQL drivers treat inconsistently.
      if (filter.mediaItemIds && filter.mediaItemIds.length === 0) return []

      const conditions = []
      if (filter.watchStatus) conditions.push(eq(libraryEntries.watchStatus, filter.watchStatus))
      if (filter.favorite !== undefined) conditions.push(eq(libraryEntries.favorite, filter.favorite))
      if (filter.type) conditions.push(eq(mediaItems.type, filter.type))
      if (filter.mediaItemIds) conditions.push(inArray(mediaItems.id, filter.mediaItemIds))
      if (filter.search && filter.search.trim().length > 0) {
        const pattern = `%${filter.search.trim()}%`
        conditions.push(or(like(mediaItems.title, pattern), like(mediaItems.originalTitle, pattern)))
      }

      const rows = await db
        .select({ entry: entryColumns, mediaItem: mediaItemColumns })
        .from(libraryEntries)
        .innerJoin(mediaItems, eq(mediaItems.id, libraryEntries.mediaItemId))
        .where(conditions.length ? and(...conditions) : undefined)

      return rows.map((row) => ({ ...row.entry, mediaItem: row.mediaItem }))
    },

    /**
     * Updates watch status, stamping startedAt/completedAt as appropriate.
     * startedAt is only set the first time an item enters 'watching'.
     * completedAt is stamped with the current time every time the status
     * (re-)enters 'completed', but is deliberately never cleared when the
     * status later moves away from 'completed' — it means "most recently
     * completed at," a historical fact, not "is currently completed." The
     * full history of every completion (for rewatches) lives in
     * watch_events, not here.
     */
    async updateStatus(id: number, watchStatus: WatchStatus): Promise<LibraryEntry | undefined> {
      const entry = await getByIdRaw(id)
      if (!entry) return undefined

      const now = new Date().toISOString()
      const patch: Partial<NewLibraryEntry> = { watchStatus, updatedAt: now }
      if (watchStatus === 'watching' && !entry.startedAt) patch.startedAt = now
      if (watchStatus === 'completed') patch.completedAt = now

      const [row] = await db
        .update(libraryEntries)
        .set(patch)
        .where(eq(libraryEntries.id, id))
        .returning()
      persist()
      return row
    },

    async rate(id: number, rating: number | null): Promise<LibraryEntry | undefined> {
      assertValidRating(rating)
      const [row] = await db
        .update(libraryEntries)
        .set({ rating, updatedAt: new Date().toISOString() })
        .where(eq(libraryEntries.id, id))
        .returning()
      persist()
      return row
    },

    async setFavorite(id: number, favorite: boolean): Promise<LibraryEntry | undefined> {
      const [row] = await db
        .update(libraryEntries)
        .set({ favorite, updatedAt: new Date().toISOString() })
        .where(eq(libraryEntries.id, id))
        .returning()
      persist()
      return row
    },

    async setNotes(id: number, notes: string | null): Promise<LibraryEntry | undefined> {
      const [row] = await db
        .update(libraryEntries)
        .set({ notes, updatedAt: new Date().toISOString() })
        .where(eq(libraryEntries.id, id))
        .returning()
      persist()
      return row
    },

    /**
     * Sets the rewatch count directly rather than incrementing it, because
     * the caller (src/main/library/watchHistory.ts) derives the true count
     * from watch_events each time a movie is (re)completed — deriving it
     * from the source of truth avoids this column ever drifting out of
     * sync with actual watch history.
     */
    async setRewatchCount(id: number, rewatchCount: number): Promise<LibraryEntry | undefined> {
      const [row] = await db
        .update(libraryEntries)
        .set({ rewatchCount, updatedAt: new Date().toISOString() })
        .where(eq(libraryEntries.id, id))
        .returning()
      persist()
      return row
    },

    /** Removes the item from the library. Does not delete the underlying media item. */
    async remove(id: number): Promise<void> {
      await db.delete(libraryEntries).where(eq(libraryEntries.id, id))
      persist()
    }
  }
}

export type LibraryEntriesRepository = ReturnType<typeof createLibraryEntriesRepository>
