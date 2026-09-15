import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTestContext } from '../testUtils'
import type { Repositories } from './index'
import type { OpenedDatabase } from '../client'
import type { MediaItem } from '../types'
import { DuplicateTagNameError } from './tags.repository'

let ctx: OpenedDatabase & { repositories: Repositories }
let movie: MediaItem

beforeEach(async () => {
  ctx = await createTestContext()
  movie = await ctx.repositories.mediaItems.create({
    type: 'movie',
    title: 'Tagged Movie',
    source: 'manual'
  })
})

afterEach(() => {
  ctx.close()
})

describe('tags repository', () => {
  it('creates and lists tags alphabetically', async () => {
    await ctx.repositories.tags.create('Comfort watch')
    await ctx.repositories.tags.create('Backlog')

    const tags = await ctx.repositories.tags.list()
    expect(tags.map((t) => t.name)).toEqual(['Backlog', 'Comfort watch'])
  })

  it('rejects a duplicate tag name', async () => {
    await ctx.repositories.tags.create('Rewatch')

    await expect(ctx.repositories.tags.create('Rewatch')).rejects.toThrow(DuplicateTagNameError)
  })

  it('attaches and lists tags for a media item', async () => {
    const tag = await ctx.repositories.tags.create('Cozy')

    await ctx.repositories.tags.attachToMediaItem(movie.id, tag.id)

    const tagsForItem = await ctx.repositories.tags.listForMediaItem(movie.id)
    expect(tagsForItem.map((t) => t.id)).toEqual([tag.id])
  })

  it('attaching the same tag twice does not create duplicate links', async () => {
    const tag = await ctx.repositories.tags.create('Cozy')

    await ctx.repositories.tags.attachToMediaItem(movie.id, tag.id)
    await ctx.repositories.tags.attachToMediaItem(movie.id, tag.id)

    const tagsForItem = await ctx.repositories.tags.listForMediaItem(movie.id)
    expect(tagsForItem).toHaveLength(1)
  })

  it('detaches a tag from a media item', async () => {
    const tag = await ctx.repositories.tags.create('Cozy')
    await ctx.repositories.tags.attachToMediaItem(movie.id, tag.id)

    await ctx.repositories.tags.detachFromMediaItem(movie.id, tag.id)

    expect(await ctx.repositories.tags.listForMediaItem(movie.id)).toHaveLength(0)
  })

  it('deleting a tag removes its links but not the media item', async () => {
    const tag = await ctx.repositories.tags.create('Cozy')
    await ctx.repositories.tags.attachToMediaItem(movie.id, tag.id)

    await ctx.repositories.tags.delete(tag.id)

    expect(await ctx.repositories.tags.listForMediaItem(movie.id)).toHaveLength(0)
    expect(await ctx.repositories.mediaItems.getById(movie.id)).toBeDefined()
  })

  describe('listMediaItemIdsForTag', () => {
    it('returns every media item id tagged with the given tag', async () => {
      const other = await ctx.repositories.mediaItems.create({ type: 'movie', title: 'Untagged', source: 'manual' })
      const tag = await ctx.repositories.tags.create('Cozy')
      await ctx.repositories.tags.attachToMediaItem(movie.id, tag.id)

      const ids = await ctx.repositories.tags.listMediaItemIdsForTag(tag.id)

      expect(ids).toEqual([movie.id])
      expect(ids).not.toContain(other.id)
    })

    it('returns an empty array for a tag attached to nothing', async () => {
      const tag = await ctx.repositories.tags.create('Unused')

      expect(await ctx.repositories.tags.listMediaItemIdsForTag(tag.id)).toEqual([])
    })
  })
})
