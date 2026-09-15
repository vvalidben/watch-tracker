import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTestContext } from '../testUtils'
import type { Repositories } from './index'
import type { OpenedDatabase } from '../client'

let ctx: OpenedDatabase & { repositories: Repositories }

beforeEach(async () => {
  ctx = await createTestContext()
})

afterEach(() => {
  ctx.close()
})

describe('mediaItems repository', () => {
  it('creates and reads back a media item', async () => {
    const created = await ctx.repositories.mediaItems.create({
      type: 'movie',
      title: 'Spirited Away',
      source: 'tmdb',
      sourceId: '129'
    })

    expect(created.id).toBeTypeOf('number')
    expect(created.title).toBe('Spirited Away')
    expect(created.createdAt).toBeTruthy()
    expect(created.updatedAt).toBe(created.createdAt)

    const fetched = await ctx.repositories.mediaItems.getById(created.id)
    expect(fetched).toEqual(created)
  })

  it('finds an item by its external source id, for dedup checks', async () => {
    const created = await ctx.repositories.mediaItems.create({
      type: 'anime',
      title: 'Frieren',
      source: 'anilist',
      sourceId: '154587'
    })

    const found = await ctx.repositories.mediaItems.findBySource('anilist', '154587')
    expect(found?.id).toBe(created.id)

    const notFound = await ctx.repositories.mediaItems.findBySource('anilist', 'does-not-exist')
    expect(notFound).toBeUndefined()
  })

  it('rejects a duplicate (source, sourceId) pair', async () => {
    await ctx.repositories.mediaItems.create({
      type: 'movie',
      title: 'Dune',
      source: 'tmdb',
      sourceId: '438631'
    })

    await expect(
      ctx.repositories.mediaItems.create({
        type: 'movie',
        title: 'Dune (duplicate add)',
        source: 'tmdb',
        sourceId: '438631'
      })
    ).rejects.toThrow()
  })

  it('allows multiple manual entries with no source id', async () => {
    const a = await ctx.repositories.mediaItems.create({
      type: 'movie',
      title: 'Home Movie A',
      source: 'manual'
    })
    const b = await ctx.repositories.mediaItems.create({
      type: 'movie',
      title: 'Home Movie B',
      source: 'manual'
    })

    expect(a.id).not.toBe(b.id)
  })

  it('lists items filtered by type, sorted by title', async () => {
    await ctx.repositories.mediaItems.create({ type: 'tv', title: 'Zeta Show', source: 'manual' })
    await ctx.repositories.mediaItems.create({ type: 'movie', title: 'A Movie', source: 'manual' })
    await ctx.repositories.mediaItems.create({ type: 'tv', title: 'Alpha Show', source: 'manual' })

    const tvItems = await ctx.repositories.mediaItems.list({ type: 'tv' })
    expect(tvItems.map((item) => item.title)).toEqual(['Alpha Show', 'Zeta Show'])
  })

  it('updates fields and bumps updatedAt', async () => {
    const created = await ctx.repositories.mediaItems.create({
      type: 'movie',
      title: 'Working Title',
      source: 'manual'
    })

    const updated = await ctx.repositories.mediaItems.update(created.id, {
      title: 'Final Title',
      overview: 'A short synopsis.'
    })

    expect(updated?.title).toBe('Final Title')
    expect(updated?.overview).toBe('A short synopsis.')
    expect(updated?.createdAt).toBe(created.createdAt)
  })

  it('deletes a media item', async () => {
    const created = await ctx.repositories.mediaItems.create({
      type: 'movie',
      title: 'To Delete',
      source: 'manual'
    })

    await ctx.repositories.mediaItems.delete(created.id)

    expect(await ctx.repositories.mediaItems.getById(created.id)).toBeUndefined()
  })
})
