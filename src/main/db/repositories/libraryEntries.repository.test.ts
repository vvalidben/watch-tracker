import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTestContext } from '../testUtils'
import type { Repositories } from './index'
import type { OpenedDatabase } from '../client'
import type { MediaItem } from '../types'
import { DuplicateLibraryEntryError } from './libraryEntries.repository'
import { InvalidRatingError } from '../validation'

let ctx: OpenedDatabase & { repositories: Repositories }
let movie: MediaItem

beforeEach(async () => {
  ctx = await createTestContext()
  movie = await ctx.repositories.mediaItems.create({
    type: 'movie',
    title: 'Paddington 2',
    source: 'manual'
  })
})

afterEach(() => {
  ctx.close()
})

describe('libraryEntries repository', () => {
  it('adds a media item to the library with sensible defaults', async () => {
    const entry = await ctx.repositories.libraryEntries.add({ mediaItemId: movie.id })

    expect(entry.watchStatus).toBe('plan_to_watch')
    expect(entry.favorite).toBe(false)
    expect(entry.rewatchCount).toBe(0)
    expect(entry.rating).toBeNull()
    expect(entry.addedAt).toBeTruthy()
  })

  it('refuses to add the same media item twice', async () => {
    await ctx.repositories.libraryEntries.add({ mediaItemId: movie.id })

    await expect(ctx.repositories.libraryEntries.add({ mediaItemId: movie.id })).rejects.toThrow(
      DuplicateLibraryEntryError
    )
  })

  it('sets startedAt the first time status becomes watching, and completedAt on completed', async () => {
    const entry = await ctx.repositories.libraryEntries.add({ mediaItemId: movie.id })

    const watching = await ctx.repositories.libraryEntries.updateStatus(entry.id, 'watching')
    expect(watching?.startedAt).toBeTruthy()

    const startedAt = watching?.startedAt

    // Re-entering 'watching' later should not overwrite the original startedAt.
    await ctx.repositories.libraryEntries.updateStatus(entry.id, 'on_hold')
    const resumed = await ctx.repositories.libraryEntries.updateStatus(entry.id, 'watching')
    expect(resumed?.startedAt).toBe(startedAt)

    const completed = await ctx.repositories.libraryEntries.updateStatus(entry.id, 'completed')
    expect(completed?.completedAt).toBeTruthy()
  })

  it('preserves completedAt when status moves away from completed (history, not current state)', async () => {
    const entry = await ctx.repositories.libraryEntries.add({ mediaItemId: movie.id })
    const completed = await ctx.repositories.libraryEntries.updateStatus(entry.id, 'completed')

    const reverted = await ctx.repositories.libraryEntries.updateStatus(entry.id, 'watching')

    expect(reverted?.completedAt).toBe(completed?.completedAt)
  })

  it('rates an entry within the valid 0-10 half-step range', async () => {
    const entry = await ctx.repositories.libraryEntries.add({ mediaItemId: movie.id })

    const rated = await ctx.repositories.libraryEntries.rate(entry.id, 8.5)
    expect(rated?.rating).toBe(8.5)
  })

  it('rejects an out-of-range or non-half-step rating', async () => {
    const entry = await ctx.repositories.libraryEntries.add({ mediaItemId: movie.id })

    await expect(ctx.repositories.libraryEntries.rate(entry.id, 10.5)).rejects.toThrow(
      InvalidRatingError
    )
    await expect(ctx.repositories.libraryEntries.rate(entry.id, 7.3)).rejects.toThrow(
      InvalidRatingError
    )
    await expect(ctx.repositories.libraryEntries.rate(entry.id, -1)).rejects.toThrow(
      InvalidRatingError
    )
  })

  it('toggles favorite and stores notes', async () => {
    const entry = await ctx.repositories.libraryEntries.add({ mediaItemId: movie.id })

    const favorited = await ctx.repositories.libraryEntries.setFavorite(entry.id, true)
    expect(favorited?.favorite).toBe(true)

    const noted = await ctx.repositories.libraryEntries.setNotes(entry.id, 'Rewatch every Christmas.')
    expect(noted?.notes).toBe('Rewatch every Christmas.')
  })

  it('edits and deletes a note', async () => {
    const entry = await ctx.repositories.libraryEntries.add({ mediaItemId: movie.id })
    await ctx.repositories.libraryEntries.setNotes(entry.id, 'First draft.')

    const edited = await ctx.repositories.libraryEntries.setNotes(entry.id, 'Edited note.')
    expect(edited?.notes).toBe('Edited note.')

    const deleted = await ctx.repositories.libraryEntries.setNotes(entry.id, null)
    expect(deleted?.notes).toBeNull()
  })

  it('sets the rewatch count directly', async () => {
    const entry = await ctx.repositories.libraryEntries.add({ mediaItemId: movie.id })

    await ctx.repositories.libraryEntries.setRewatchCount(entry.id, 1)
    const twice = await ctx.repositories.libraryEntries.setRewatchCount(entry.id, 2)

    expect(twice?.rewatchCount).toBe(2)
  })

  it('filters list() by watch status and favorite', async () => {
    const other = await ctx.repositories.mediaItems.create({
      type: 'movie',
      title: 'Another Movie',
      source: 'manual'
    })
    const a = await ctx.repositories.libraryEntries.add({ mediaItemId: movie.id })
    const b = await ctx.repositories.libraryEntries.add({ mediaItemId: other.id })
    await ctx.repositories.libraryEntries.updateStatus(a.id, 'completed')
    await ctx.repositories.libraryEntries.setFavorite(b.id, true)

    const completed = await ctx.repositories.libraryEntries.list({ watchStatus: 'completed' })
    expect(completed.map((e) => e.id)).toEqual([a.id])

    const favorites = await ctx.repositories.libraryEntries.list({ favorite: true })
    expect(favorites.map((e) => e.id)).toEqual([b.id])
  })

  it('listWithMedia joins the underlying media item', async () => {
    await ctx.repositories.libraryEntries.add({ mediaItemId: movie.id })

    const [entry] = await ctx.repositories.libraryEntries.listWithMedia()
    expect(entry.mediaItem.title).toBe('Paddington 2')
  })

  it('removes a library entry without deleting the media item', async () => {
    const entry = await ctx.repositories.libraryEntries.add({ mediaItemId: movie.id })

    await ctx.repositories.libraryEntries.remove(entry.id)

    expect(await ctx.repositories.libraryEntries.getById(entry.id)).toBeUndefined()
    expect(await ctx.repositories.mediaItems.getById(movie.id)).toBeDefined()
  })

  describe('listLibraryView', () => {
    it('returns every entry joined with its media item when no filter is given', async () => {
      const anime = await ctx.repositories.mediaItems.create({ type: 'anime', title: 'Frieren', source: 'manual' })
      await ctx.repositories.libraryEntries.add({ mediaItemId: movie.id })
      await ctx.repositories.libraryEntries.add({ mediaItemId: anime.id })

      const all = await ctx.repositories.libraryEntries.listLibraryView({})

      expect(all).toHaveLength(2)
      expect(all.map((item) => item.mediaItem.title).sort()).toEqual(['Frieren', 'Paddington 2'])
    })

    it('filters by media type', async () => {
      const anime = await ctx.repositories.mediaItems.create({ type: 'anime', title: 'Frieren', source: 'manual' })
      await ctx.repositories.libraryEntries.add({ mediaItemId: movie.id })
      await ctx.repositories.libraryEntries.add({ mediaItemId: anime.id })

      const animeOnly = await ctx.repositories.libraryEntries.listLibraryView({ type: 'anime' })

      expect(animeOnly).toHaveLength(1)
      expect(animeOnly[0].mediaItem.title).toBe('Frieren')
    })

    it('filters by watch status', async () => {
      const other = await ctx.repositories.mediaItems.create({ type: 'movie', title: 'Other', source: 'manual' })
      const a = await ctx.repositories.libraryEntries.add({ mediaItemId: movie.id })
      await ctx.repositories.libraryEntries.add({ mediaItemId: other.id })
      await ctx.repositories.libraryEntries.updateStatus(a.id, 'completed')

      const completed = await ctx.repositories.libraryEntries.listLibraryView({ watchStatus: 'completed' })

      expect(completed).toHaveLength(1)
      expect(completed[0].mediaItem.title).toBe('Paddington 2')
    })

    it('filters by favorite', async () => {
      const other = await ctx.repositories.mediaItems.create({ type: 'movie', title: 'Other', source: 'manual' })
      const a = await ctx.repositories.libraryEntries.add({ mediaItemId: movie.id })
      await ctx.repositories.libraryEntries.add({ mediaItemId: other.id })
      await ctx.repositories.libraryEntries.setFavorite(a.id, true)

      const favorites = await ctx.repositories.libraryEntries.listLibraryView({ favorite: true })

      expect(favorites).toHaveLength(1)
      expect(favorites[0].mediaItem.title).toBe('Paddington 2')
    })

    it('searches by title, case-insensitively and as a substring', async () => {
      const anime = await ctx.repositories.mediaItems.create({ type: 'anime', title: 'Frieren', source: 'manual' })
      await ctx.repositories.libraryEntries.add({ mediaItemId: movie.id })
      await ctx.repositories.libraryEntries.add({ mediaItemId: anime.id })

      const results = await ctx.repositories.libraryEntries.listLibraryView({ search: 'FRIE' })

      expect(results).toHaveLength(1)
      expect(results[0].mediaItem.title).toBe('Frieren')
    })

    it('searches by original title as well as title', async () => {
      const anime = await ctx.repositories.mediaItems.create({
        type: 'anime',
        title: 'Frieren: Beyond Journey’s End',
        originalTitle: 'Sousou no Frieren',
        source: 'manual'
      })
      await ctx.repositories.libraryEntries.add({ mediaItemId: anime.id })

      const results = await ctx.repositories.libraryEntries.listLibraryView({ search: 'Sousou' })

      expect(results).toHaveLength(1)
    })

    it('searches by romaji title when the original title is in Japanese', async () => {
      const anime = await ctx.repositories.mediaItems.create({
        type: 'anime',
        title: 'Frieren: Beyond Journey’s End',
        originalTitle: '葬送のフリーレン',
        romajiTitle: 'Sousou no Frieren',
        source: 'anilist',
        sourceId: '154587'
      })
      await ctx.repositories.libraryEntries.add({ mediaItemId: anime.id })

      const results = await ctx.repositories.libraryEntries.listLibraryView({ search: 'sousou' })

      expect(results.map((result) => result.mediaItem.id)).toEqual([anime.id])
    })

    it('combines multiple filters (AND semantics)', async () => {
      const anime = await ctx.repositories.mediaItems.create({ type: 'anime', title: 'Frieren', source: 'manual' })
      const otherAnime = await ctx.repositories.mediaItems.create({
        type: 'anime',
        title: 'Other Anime',
        source: 'manual'
      })
      const a = await ctx.repositories.libraryEntries.add({ mediaItemId: anime.id })
      await ctx.repositories.libraryEntries.add({ mediaItemId: otherAnime.id })
      await ctx.repositories.libraryEntries.setFavorite(a.id, true)

      const results = await ctx.repositories.libraryEntries.listLibraryView({ type: 'anime', favorite: true })

      expect(results).toHaveLength(1)
      expect(results[0].mediaItem.title).toBe('Frieren')
    })

    it('returns an empty array when nothing matches', async () => {
      await ctx.repositories.libraryEntries.add({ mediaItemId: movie.id })

      const results = await ctx.repositories.libraryEntries.listLibraryView({ search: 'no such title' })

      expect(results).toEqual([])
    })
  })
})
