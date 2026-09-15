import { and, asc, eq, getTableColumns, inArray } from 'drizzle-orm'
import type { DbContext } from '../context'
import { firstOf } from '../queryHelpers'
import { mediaTags, tags } from '../schema'
import type { Tag } from '../types'

export class DuplicateTagNameError extends Error {
  constructor(name: string) {
    super(`A tag named "${name}" already exists`)
    this.name = 'DuplicateTagNameError'
  }
}

const tagColumns = getTableColumns(tags)
const mediaTagColumns = getTableColumns(mediaTags)

export function createTagsRepository({ db, persist }: DbContext) {
  return {
    async create(name: string, color?: string | null): Promise<Tag> {
      const existing = await firstOf(db.select(tagColumns).from(tags).where(eq(tags.name, name)).limit(1))
      if (existing) throw new DuplicateTagNameError(name)

      const [row] = await db
        .insert(tags)
        .values({ name, color: color ?? null, createdAt: new Date().toISOString() })
        .returning()
      persist()
      return row
    },

    async list(): Promise<Tag[]> {
      return db.select(tagColumns).from(tags).orderBy(asc(tags.name))
    },

    /** Cascades to remove this tag's links from every media item. */
    async delete(id: number): Promise<void> {
      await db.delete(tags).where(eq(tags.id, id))
      persist()
    },

    async attachToMediaItem(mediaItemId: number, tagId: number): Promise<void> {
      await db
        .insert(mediaTags)
        .values({ mediaItemId, tagId })
        .onConflictDoNothing({ target: [mediaTags.mediaItemId, mediaTags.tagId] })
      persist()
    },

    async detachFromMediaItem(mediaItemId: number, tagId: number): Promise<void> {
      await db
        .delete(mediaTags)
        .where(and(eq(mediaTags.mediaItemId, mediaItemId), eq(mediaTags.tagId, tagId)))
      persist()
    },

    async listForMediaItem(mediaItemId: number): Promise<Tag[]> {
      const links = await db
        .select(mediaTagColumns)
        .from(mediaTags)
        .where(eq(mediaTags.mediaItemId, mediaItemId))
      if (links.length === 0) return []

      const tagIds = links.map((link) => link.tagId)
      return db.select(tagColumns).from(tags).where(inArray(tags.id, tagIds)).orderBy(asc(tags.name))
    },

    /** Every media item id tagged with this tag — for the Library page's tag filter. */
    async listMediaItemIdsForTag(tagId: number): Promise<number[]> {
      const rows = await db.select(mediaTagColumns).from(mediaTags).where(eq(mediaTags.tagId, tagId))
      return rows.map((row) => row.mediaItemId)
    }
  }
}

export type TagsRepository = ReturnType<typeof createTagsRepository>
