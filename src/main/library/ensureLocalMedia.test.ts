import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTestContext } from '../db/testUtils'
import type { Repositories } from '../db/repositories'
import type { OpenedDatabase } from '../db/client'
import type { NormalizedMedia } from '@shared/metadata'
import { getOrCreateEpisode, getOrCreateMediaItem, getOrCreateSeason } from './ensureLocalMedia'

let ctx: OpenedDatabase & { repositories: Repositories }

function makeMedia(overrides: Partial<NormalizedMedia> = {}): NormalizedMedia {
  return {
    externalId: '1399',
    source: 'tmdb',
    mediaType: 'tv',
    title: 'Game of Thrones',
    originalTitle: null,
    poster: 'https://image.tmdb.org/t/p/w500/got.jpg',
    backdrop: null,
    description: 'Seven noble families fight for control.',
    releaseDate: '2011-04-17',
    status: 'finished',
    genres: ['Drama'],
    rating: 8.4,
    numberOfSeasons: 8,
    numberOfEpisodes: 73,
    ...overrides
  }
}

beforeEach(async () => {
  ctx = await createTestContext()
})

afterEach(() => {
  ctx.close()
})

describe('getOrCreateMediaItem', () => {
  it('creates a media_item from normalized details on first touch', async () => {
    const media = makeMedia()
    const item = await getOrCreateMediaItem(ctx.repositories, media)

    expect(item.source).toBe('tmdb')
    expect(item.sourceId).toBe('1399')
    expect(item.title).toBe('Game of Thrones')
    expect(item.airingStatus).toBe('finished')
    expect(item.genres).toEqual(['Drama'])
  })

  it('saves the romaji title when the provider has one', async () => {
    const item = await getOrCreateMediaItem(ctx.repositories, makeMedia({ source: 'anilist', mediaType: 'anime', romajiTitle: 'Sousou no Frieren' }))

    expect(item.romajiTitle).toBe('Sousou no Frieren')
  })

  it('never creates a second row for the same (source, externalId) — identified by external id, not title', async () => {
    const media = makeMedia()
    const first = await getOrCreateMediaItem(ctx.repositories, media)

    // Same external id, but the title/overview text has since changed upstream —
    // must still resolve to the SAME local row rather than creating a duplicate.
    const second = await getOrCreateMediaItem(
      ctx.repositories,
      makeMedia({ title: 'Game of Thrones (Renamed)', description: 'Updated synopsis.' })
    )

    expect(second.id).toBe(first.id)
    const all = await ctx.repositories.mediaItems.list()
    expect(all).toHaveLength(1)
  })

  it('preserves personal data (rating, favorite, notes) when a title already in the library is "added" again', async () => {
    const media = makeMedia()
    const mediaItem = await getOrCreateMediaItem(ctx.repositories, media)
    const entry = await ctx.repositories.libraryEntries.add({ mediaItemId: mediaItem.id })
    await ctx.repositories.libraryEntries.rate(entry.id, 9.5)
    await ctx.repositories.libraryEntries.setFavorite(entry.id, true)
    await ctx.repositories.libraryEntries.setNotes(entry.id, 'Rewatch every year.')

    // The user (or a stale detail page) triggers "Add to Library" again, with
    // the provider now reporting different metadata than when it was first added.
    const refetched = await getOrCreateMediaItem(
      ctx.repositories,
      makeMedia({ title: 'Game of Thrones (Renamed)', description: 'Updated synopsis from the provider.' })
    )
    const existingEntry = await ctx.repositories.libraryEntries.getByMediaItemId(refetched.id)

    expect(refetched.id).toBe(mediaItem.id)
    expect(existingEntry?.id).toBe(entry.id)
    expect(existingEntry?.rating).toBe(9.5)
    expect(existingEntry?.favorite).toBe(true)
    expect(existingEntry?.notes).toBe('Rewatch every year.')
    // getOrCreateMediaItem never updates an existing row's cached fields either —
    // "refreshing" metadata is simply not something that can silently happen today.
    expect(refetched.title).toBe('Game of Thrones')
  })

  it('treats different external ids (even same title) as different media items', async () => {
    const a = await getOrCreateMediaItem(ctx.repositories, makeMedia({ externalId: '1' }))
    const b = await getOrCreateMediaItem(ctx.repositories, makeMedia({ externalId: '2' }))

    expect(a.id).not.toBe(b.id)
  })

  it('keeps tmdb and anilist entries separate even with the same external id string', async () => {
    const tmdbItem = await getOrCreateMediaItem(ctx.repositories, makeMedia({ source: 'tmdb', externalId: '1' }))
    const anilistItem = await getOrCreateMediaItem(
      ctx.repositories,
      makeMedia({ source: 'anilist', mediaType: 'anime', externalId: '1' })
    )

    expect(tmdbItem.id).not.toBe(anilistItem.id)
  })
})

describe('getOrCreateSeason / getOrCreateEpisode', () => {
  it('stores only the identifying season/episode number, not copied titles or overviews', async () => {
    const mediaItem = await getOrCreateMediaItem(ctx.repositories, makeMedia())
    const season = await getOrCreateSeason(ctx.repositories, mediaItem.id, 1)
    const episode = await getOrCreateEpisode(ctx.repositories, season.id, 5)

    expect(season.seasonNumber).toBe(1)
    expect(season.title).toBeNull()
    expect(episode.episodeNumber).toBe(5)
    expect(episode.title).toBeNull()
  })

  it('returns the same season/episode row on repeated calls instead of duplicating', async () => {
    const mediaItem = await getOrCreateMediaItem(ctx.repositories, makeMedia())

    const seasonA = await getOrCreateSeason(ctx.repositories, mediaItem.id, 1)
    const seasonB = await getOrCreateSeason(ctx.repositories, mediaItem.id, 1)
    expect(seasonA.id).toBe(seasonB.id)
    expect(await ctx.repositories.seasons.listByMediaItem(mediaItem.id)).toHaveLength(1)

    const episodeA = await getOrCreateEpisode(ctx.repositories, seasonA.id, 3)
    const episodeB = await getOrCreateEpisode(ctx.repositories, seasonA.id, 3)
    expect(episodeA.id).toBe(episodeB.id)
    expect(await ctx.repositories.episodes.listBySeason(seasonA.id)).toHaveLength(1)
  })
})
