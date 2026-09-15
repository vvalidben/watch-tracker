import { and, asc, eq, getTableColumns } from 'drizzle-orm'
import type { DbContext } from '../context'
import { firstOf } from '../queryHelpers'
import { mediaItems } from '../schema'
import type { MediaItem, MediaSource, MediaType, NewMediaItem } from '../types'

export type CreateMediaItemInput = Omit<NewMediaItem, 'id' | 'createdAt' | 'updatedAt'>
export type UpdateMediaItemInput = Partial<Omit<NewMediaItem, 'id' | 'createdAt' | 'updatedAt'>>

const columns = getTableColumns(mediaItems)

export function createMediaItemsRepository({ db, persist }: DbContext) {
  return {
    async create(input: CreateMediaItemInput): Promise<MediaItem> {
      const now = new Date().toISOString()
      const [row] = await db
        .insert(mediaItems)
        .values({ ...input, createdAt: now, updatedAt: now })
        .returning()
      persist()
      return row
    },

    async getById(id: number): Promise<MediaItem | undefined> {
      return firstOf(db.select(columns).from(mediaItems).where(eq(mediaItems.id, id)).limit(1))
    },

    /** Looks up an item by its external metadata provider id, for add/dedup flows. */
    async findBySource(source: MediaSource, sourceId: string): Promise<MediaItem | undefined> {
      return firstOf(
        db
          .select(columns)
          .from(mediaItems)
          .where(and(eq(mediaItems.source, source), eq(mediaItems.sourceId, sourceId)))
          .limit(1)
      )
    },

    async list(filter?: { type?: MediaType }): Promise<MediaItem[]> {
      const where = filter?.type ? eq(mediaItems.type, filter.type) : undefined
      const query = db.select(columns).from(mediaItems)
      return (where ? query.where(where) : query).orderBy(asc(mediaItems.title))
    },

    async update(id: number, changes: UpdateMediaItemInput): Promise<MediaItem | undefined> {
      const [row] = await db
        .update(mediaItems)
        .set({ ...changes, updatedAt: new Date().toISOString() })
        .where(eq(mediaItems.id, id))
        .returning()
      persist()
      return row
    },

    /** Cascades to the item's seasons, episodes, library entry, and tag links. */
    async delete(id: number): Promise<void> {
      await db.delete(mediaItems).where(eq(mediaItems.id, id))
      persist()
    }
  }
}

export type MediaItemsRepository = ReturnType<typeof createMediaItemsRepository>
