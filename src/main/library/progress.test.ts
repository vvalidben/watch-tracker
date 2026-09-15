import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestContext } from '../db/testUtils'
import type { Repositories } from '../db/repositories'
import type { OpenedDatabase } from '../db/client'
import type { MediaSearchService } from '../metadata'
import type { NormalizedEpisode, NormalizedMedia, NormalizedSeason } from '@shared/metadata'
import { computeSeriesProgress, recomputeAndApplyStatus } from './progress'
import { getOrCreateMediaItem } from './ensureLocalMedia'

let ctx: OpenedDatabase & { repositories: Repositories }

function makeMedia(overrides: Partial<NormalizedMedia> = {}): NormalizedMedia {
  return {
    externalId: '1399',
    source: 'tmdb',
    mediaType: 'tv',
    title: 'Attack on Titan',
    originalTitle: null,
    poster: null,
    backdrop: null,
    description: null,
    releaseDate: null,
    status: null,
    genres: [],
    rating: null,
    numberOfSeasons: 5,
    numberOfEpisodes: 87,
    ...overrides
  }
}

function makeMetadataService(seasons: NormalizedSeason[], episodesBySeason: Record<number, NormalizedEpisode[]>): MediaSearchService {
  return {
    search: vi.fn(),
    getDetails: vi.fn(),
    getSeasons: vi.fn().mockResolvedValue({ seasons, error: null }),
    getEpisodes: vi.fn((_source, _type, _id, seasonNumber: number) =>
      Promise.resolve({ episodes: episodesBySeason[seasonNumber] ?? [], error: null })
    )
  }
}

function season(seasonNumber: number, episodeCount: number): NormalizedSeason {
  return { seasonNumber, title: null, overview: null, poster: null, airDate: null, episodeCount }
}

function episodesFor(count: number): NormalizedEpisode[] {
  return Array.from({ length: count }, (_, i) => ({
    episodeNumber: i + 1,
    title: null,
    overview: null,
    airDate: null,
    runtimeMinutes: null
  }))
}

beforeEach(async () => {
  ctx = await createTestContext()
})

afterEach(() => {
  ctx.close()
})

describe('computeSeriesProgress', () => {
  it('returns null for a movie', async () => {
    const media = makeMedia({ mediaType: 'movie' })
    const mediaItem = await getOrCreateMediaItem(ctx.repositories, media)
    const metadataService = makeMetadataService([], {})

    const progress = await computeSeriesProgress(ctx.repositories, metadataService, media, mediaItem.id)

    expect(progress).toBeNull()
  })

  it('reports zero progress and the first season as current for a freshly-added show', async () => {
    const media = makeMedia()
    const mediaItem = await getOrCreateMediaItem(ctx.repositories, media)
    const metadataService = makeMetadataService([season(1, 25), season(2, 12)], {
      1: episodesFor(25),
      2: episodesFor(12)
    })

    const progress = await computeSeriesProgress(ctx.repositories, metadataService, media, mediaItem.id)

    expect(progress).toEqual({
      watchedEpisodes: 0,
      totalEpisodes: 37,
      percentage: 0,
      currentSeasonNumber: 1,
      currentSeasonTotalEpisodes: 25,
      currentEpisodeNumber: 1,
      isFullyWatched: false
    })
  })

  it('reflects locally-watched episodes and finds the correct current season/episode', async () => {
    const media = makeMedia()
    const mediaItem = await getOrCreateMediaItem(ctx.repositories, media)
    const metadataService = makeMetadataService([season(1, 25), season(2, 12)], {
      1: episodesFor(25),
      2: episodesFor(12)
    })

    // Watch all of season 1, plus the first 4 episodes of season 2.
    const s1 = await ctx.repositories.seasons.create({ mediaItemId: mediaItem.id, seasonNumber: 1 })
    for (let n = 1; n <= 25; n++) {
      const ep = await ctx.repositories.episodes.create({ seasonId: s1.id, episodeNumber: n })
      await ctx.repositories.episodeProgress.markWatched(ep.id)
    }
    const s2 = await ctx.repositories.seasons.create({ mediaItemId: mediaItem.id, seasonNumber: 2 })
    for (let n = 1; n <= 4; n++) {
      const ep = await ctx.repositories.episodes.create({ seasonId: s2.id, episodeNumber: n })
      await ctx.repositories.episodeProgress.markWatched(ep.id)
    }

    const progress = await computeSeriesProgress(ctx.repositories, metadataService, media, mediaItem.id)

    expect(progress).toEqual({
      watchedEpisodes: 29,
      totalEpisodes: 37,
      percentage: 78, // 29/37, matches the mechanism though not the spec's larger example
      currentSeasonNumber: 2,
      currentSeasonTotalEpisodes: 12,
      currentEpisodeNumber: 5,
      isFullyWatched: false
    })
  })

  it('reports full completion once every season is fully watched', async () => {
    const media = makeMedia()
    const mediaItem = await getOrCreateMediaItem(ctx.repositories, media)
    const metadataService = makeMetadataService([season(1, 2)], { 1: episodesFor(2) })

    const s1 = await ctx.repositories.seasons.create({ mediaItemId: mediaItem.id, seasonNumber: 1 })
    for (let n = 1; n <= 2; n++) {
      const ep = await ctx.repositories.episodes.create({ seasonId: s1.id, episodeNumber: n })
      await ctx.repositories.episodeProgress.markWatched(ep.id)
    }

    const progress = await computeSeriesProgress(ctx.repositories, metadataService, media, mediaItem.id)

    expect(progress?.isFullyWatched).toBe(true)
    expect(progress?.percentage).toBe(100)
    expect(progress?.currentEpisodeNumber).toBe(2)
  })

  it('throws (rather than silently reporting zero progress) when the provider is unreachable', async () => {
    const media = makeMedia()
    const mediaItem = await getOrCreateMediaItem(ctx.repositories, media)
    const metadataService: MediaSearchService = {
      search: vi.fn(),
      getDetails: vi.fn(),
      getSeasons: vi.fn().mockResolvedValue({
        seasons: [],
        error: { source: 'tmdb', code: 'network', message: 'No internet connection' }
      }),
      getEpisodes: vi.fn()
    }

    await expect(computeSeriesProgress(ctx.repositories, metadataService, media, mediaItem.id)).rejects.toThrow(
      'No internet connection'
    )
  })

  it('throws when the current season’s episode list fails to load, even if the season list succeeded', async () => {
    const media = makeMedia()
    const mediaItem = await getOrCreateMediaItem(ctx.repositories, media)
    const metadataService: MediaSearchService = {
      search: vi.fn(),
      getDetails: vi.fn(),
      getSeasons: vi.fn().mockResolvedValue({ seasons: [season(1, 12)], error: null }),
      getEpisodes: vi.fn().mockResolvedValue({
        episodes: [],
        error: { source: 'tmdb', code: 'rate_limited', message: 'Too many requests' }
      })
    }

    await expect(computeSeriesProgress(ctx.repositories, metadataService, media, mediaItem.id)).rejects.toThrow(
      'Too many requests'
    )
  })
})

describe('recomputeAndApplyStatus', () => {
  it('sets status to watching once some (but not all) episodes are watched', async () => {
    const media = makeMedia()
    const mediaItem = await getOrCreateMediaItem(ctx.repositories, media)
    const entry = await ctx.repositories.libraryEntries.add({ mediaItemId: mediaItem.id })
    const metadataService = makeMetadataService([season(1, 4)], { 1: episodesFor(4) })

    const s1 = await ctx.repositories.seasons.create({ mediaItemId: mediaItem.id, seasonNumber: 1 })
    const ep1 = await ctx.repositories.episodes.create({ seasonId: s1.id, episodeNumber: 1 })
    await ctx.repositories.episodeProgress.markWatched(ep1.id)

    await recomputeAndApplyStatus(ctx.repositories, metadataService, media, mediaItem.id, entry.id, entry.watchStatus)

    const updated = await ctx.repositories.libraryEntries.getById(entry.id)
    expect(updated?.watchStatus).toBe('watching')
  })

  it('sets status to completed once every episode is watched', async () => {
    const media = makeMedia()
    const mediaItem = await getOrCreateMediaItem(ctx.repositories, media)
    const entry = await ctx.repositories.libraryEntries.add({ mediaItemId: mediaItem.id })
    const metadataService = makeMetadataService([season(1, 2)], { 1: episodesFor(2) })

    const s1 = await ctx.repositories.seasons.create({ mediaItemId: mediaItem.id, seasonNumber: 1 })
    for (let n = 1; n <= 2; n++) {
      const ep = await ctx.repositories.episodes.create({ seasonId: s1.id, episodeNumber: n })
      await ctx.repositories.episodeProgress.markWatched(ep.id)
    }

    await recomputeAndApplyStatus(ctx.repositories, metadataService, media, mediaItem.id, entry.id, entry.watchStatus)

    const updated = await ctx.repositories.libraryEntries.getById(entry.id)
    expect(updated?.watchStatus).toBe('completed')
    expect(updated?.completedAt).toBeTruthy()
  })

  it('does not disturb a manually-set dropped status under partial progress', async () => {
    const media = makeMedia()
    const mediaItem = await getOrCreateMediaItem(ctx.repositories, media)
    const entry = await ctx.repositories.libraryEntries.add({ mediaItemId: mediaItem.id })
    await ctx.repositories.libraryEntries.updateStatus(entry.id, 'dropped')
    const metadataService = makeMetadataService([season(1, 4)], { 1: episodesFor(4) })

    const s1 = await ctx.repositories.seasons.create({ mediaItemId: mediaItem.id, seasonNumber: 1 })
    const ep1 = await ctx.repositories.episodes.create({ seasonId: s1.id, episodeNumber: 1 })
    await ctx.repositories.episodeProgress.markWatched(ep1.id)

    await recomputeAndApplyStatus(ctx.repositories, metadataService, media, mediaItem.id, entry.id, 'dropped')

    const updated = await ctx.repositories.libraryEntries.getById(entry.id)
    expect(updated?.watchStatus).toBe('dropped')
  })

  it('overrides a dropped status back to completed once everything is watched', async () => {
    const media = makeMedia()
    const mediaItem = await getOrCreateMediaItem(ctx.repositories, media)
    const entry = await ctx.repositories.libraryEntries.add({ mediaItemId: mediaItem.id })
    await ctx.repositories.libraryEntries.updateStatus(entry.id, 'dropped')
    const metadataService = makeMetadataService([season(1, 1)], { 1: episodesFor(1) })

    const s1 = await ctx.repositories.seasons.create({ mediaItemId: mediaItem.id, seasonNumber: 1 })
    const ep1 = await ctx.repositories.episodes.create({ seasonId: s1.id, episodeNumber: 1 })
    await ctx.repositories.episodeProgress.markWatched(ep1.id)

    await recomputeAndApplyStatus(ctx.repositories, metadataService, media, mediaItem.id, entry.id, 'dropped')

    const updated = await ctx.repositories.libraryEntries.getById(entry.id)
    expect(updated?.watchStatus).toBe('completed')
  })

  it('reverts status to plan_to_watch when unwatching back to zero progress', async () => {
    const media = makeMedia()
    const mediaItem = await getOrCreateMediaItem(ctx.repositories, media)
    const entry = await ctx.repositories.libraryEntries.add({ mediaItemId: mediaItem.id })
    await ctx.repositories.libraryEntries.updateStatus(entry.id, 'watching')
    const metadataService = makeMetadataService([season(1, 4)], { 1: episodesFor(4) })
    await ctx.repositories.seasons.create({ mediaItemId: mediaItem.id, seasonNumber: 1 })

    await recomputeAndApplyStatus(ctx.repositories, metadataService, media, mediaItem.id, entry.id, 'watching')

    const updated = await ctx.repositories.libraryEntries.getById(entry.id)
    expect(updated?.watchStatus).toBe('plan_to_watch')
  })

  it('is a no-op for a movie', async () => {
    const media = makeMedia({ mediaType: 'movie' })
    const mediaItem = await getOrCreateMediaItem(ctx.repositories, media)
    const entry = await ctx.repositories.libraryEntries.add({ mediaItemId: mediaItem.id })
    await ctx.repositories.libraryEntries.updateStatus(entry.id, 'watching')
    const metadataService = makeMetadataService([], {})

    await recomputeAndApplyStatus(ctx.repositories, metadataService, media, mediaItem.id, entry.id, 'watching')

    const updated = await ctx.repositories.libraryEntries.getById(entry.id)
    expect(updated?.watchStatus).toBe('watching')
  })

  it('leaves status untouched (rather than throwing) when the provider is unreachable', async () => {
    const media = makeMedia()
    const mediaItem = await getOrCreateMediaItem(ctx.repositories, media)
    const entry = await ctx.repositories.libraryEntries.add({ mediaItemId: mediaItem.id })
    await ctx.repositories.libraryEntries.updateStatus(entry.id, 'watching')
    const metadataService: MediaSearchService = {
      search: vi.fn(),
      getDetails: vi.fn(),
      getSeasons: vi.fn().mockResolvedValue({
        seasons: [],
        error: { source: 'tmdb', code: 'network', message: 'offline' }
      }),
      getEpisodes: vi.fn()
    }

    // The episode-watched mutation this follows already succeeded locally
    // (see ipc/library.ts) — a provider hiccup here must not surface as a
    // failure of that already-completed action.
    await expect(
      recomputeAndApplyStatus(ctx.repositories, metadataService, media, mediaItem.id, entry.id, 'watching')
    ).resolves.toBeUndefined()

    const updated = await ctx.repositories.libraryEntries.getById(entry.id)
    expect(updated?.watchStatus).toBe('watching')
  })
})
