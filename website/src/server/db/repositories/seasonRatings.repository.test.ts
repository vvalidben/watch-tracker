import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTestContext } from '../testUtils'
import type { Repositories } from './index'
import type { OpenedDatabase } from '../client'
import type { Season } from '../types'
import { InvalidRatingError } from '../validation'

let ctx: OpenedDatabase & { repositories: Repositories }
let season: Season

beforeEach(async () => {
  ctx = await createTestContext()
  const show = await ctx.repositories.mediaItems.create({
    type: 'tv',
    title: 'Test Show',
    source: 'manual'
  })
  season = await ctx.repositories.seasons.create({ mediaItemId: show.id, seasonNumber: 1 })
})

afterEach(() => {
  ctx.close()
})

describe('seasonRatings repository', () => {
  it('has no rating row until rated', async () => {
    expect(await ctx.repositories.seasonRatings.getBySeasonId(season.id)).toBeUndefined()
  })

  it('rates a season, creating the row lazily', async () => {
    const rating = await ctx.repositories.seasonRatings.rate(season.id, 9.5)
    expect(rating.rating).toBe(9.5)
  })

  it('rejects an invalid season rating', async () => {
    await expect(ctx.repositories.seasonRatings.rate(season.id, 3.25)).rejects.toThrow(
      InvalidRatingError
    )
  })

  it('updates the rating in place rather than creating a second row', async () => {
    await ctx.repositories.seasonRatings.rate(season.id, 7)
    await ctx.repositories.seasonRatings.rate(season.id, 8)

    const rating = await ctx.repositories.seasonRatings.getBySeasonId(season.id)
    expect(rating?.rating).toBe(8)
  })

  it('stores notes independently of rating', async () => {
    await ctx.repositories.seasonRatings.rate(season.id, 7)
    const rating = await ctx.repositories.seasonRatings.setNotes(season.id, 'Weakest arc.')

    expect(rating.rating).toBe(7)
    expect(rating.notes).toBe('Weakest arc.')
  })

  it('edits and deletes a season note without disturbing the rating', async () => {
    await ctx.repositories.seasonRatings.rate(season.id, 7)
    await ctx.repositories.seasonRatings.setNotes(season.id, 'First draft.')

    const edited = await ctx.repositories.seasonRatings.setNotes(season.id, 'Edited note.')
    expect(edited.notes).toBe('Edited note.')

    const deleted = await ctx.repositories.seasonRatings.setNotes(season.id, null)
    expect(deleted.notes).toBeNull()
    expect(deleted.rating).toBe(7)
  })
})
