import { ipcMain } from 'electron'
import type {
  AddToLibraryRequest,
  EpisodeProgressDTO,
  GetEpisodeHistoryRequest,
  GetEpisodeHistoryResponse,
  GetEpisodeProgressRequest,
  GetEpisodeProgressResponse,
  GetLibraryStateRequest,
  GetLibraryStateResponse,
  GetMovieHistoryRequest,
  GetMovieHistoryResponse,
  GetSeasonRatingRequest,
  GetSeasonRatingResponse,
  GetSeriesProgressRequest,
  GetSeriesProgressResponse,
  GetSeriesRatingSummaryRequest,
  GetSeriesRatingSummaryResponse,
  LibraryStateResult,
  ListLibraryRequest,
  ListLibraryResponse,
  RateEpisodeRequest,
  RateMediaRequest,
  RateSeasonRequest,
  RemoveFromLibraryRequest,
  SetEpisodeNotesRequest,
  SetEpisodeWatchedRequest,
  SetEpisodeWatchedResult,
  SetFavoriteRequest,
  SetNotesRequest,
  SetSeasonNotesRequest,
  SetSeasonWatchedRequest,
  SetSeriesWatchedRequest,
  SetWatchStatusRequest,
  WatchMutationResult
} from '@shared/library'
import type { IpcResult } from '@shared/ipcResult'
import type { NormalizedMedia } from '@shared/metadata'
import type { Repositories } from '../db/repositories'
import type { LibraryEntry } from '../db/types'
import type { MediaSearchService } from '../metadata'
import { toLibraryEntryDTO, toMediaItemDTO } from '../library/dto'
import {
  getOrCreateEpisode,
  getOrCreateEpisodesForSeason,
  getOrCreateMediaItem,
  getOrCreateSeason
} from '../library/ensureLocalMedia'
import { listLibrary } from '../library/libraryView'
import { computeSeriesProgress, recomputeAndApplyStatus } from '../library/progress'
import { computeSeriesRatingRollup } from '../library/ratings'
import { recordEpisodesWatched, recordEpisodeWatched, recordMovieWatched } from '../library/watchHistory'

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

async function resultOf<T>(fn: () => Promise<T>): Promise<IpcResult<T>> {
  try {
    return { ok: true, data: await fn() }
  } catch (error) {
    return { ok: false, error: toMessage(error) }
  }
}

function mustExist<T>(value: T | undefined, message: string): T {
  if (value === undefined) throw new Error(message)
  return value
}

function toProgressDTO(
  progress: { watched: boolean; watchedAt: string | null; rating: number | null; notes: string | null },
  watchCount = 0
): EpisodeProgressDTO {
  return {
    watched: progress.watched,
    watchedAt: progress.watchedAt,
    rating: progress.rating,
    notes: progress.notes,
    watchCount
  }
}

export function registerLibraryIpc(repositories: Repositories, metadataService: MediaSearchService): void {
  async function ensureLibraryEntry(mediaItemId: number): Promise<LibraryEntry> {
    const existing = await repositories.libraryEntries.getByMediaItemId(mediaItemId)
    if (existing) return existing
    return repositories.libraryEntries.add({ mediaItemId })
  }

  /** Re-fetches the entry so its watchStatus reflects any auto-recompute just applied. */
  async function reloadLibraryEntry(id: number): Promise<LibraryEntry> {
    return mustExist(
      await repositories.libraryEntries.getById(id),
      'Library entry disappeared after status recompute'
    )
  }

  /** Ensures every given episode number exists locally, then bulk-sets its watched flag. */
  async function markSeasonEpisodesWatched(
    mediaItemId: number,
    seasonNumber: number,
    episodeNumbers: number[],
    watched: boolean
  ): Promise<void> {
    if (episodeNumbers.length === 0) return
    const { episodes } = await getOrCreateEpisodesForSeason(repositories, mediaItemId, seasonNumber, episodeNumbers)
    const episodeIds = episodes.map((episode) => episode.id)
    const watchedAt = new Date().toISOString()
    await repositories.episodeProgress.setManyWatched(episodeIds, watched)
    // Only marking watched is a "watch" — unwatching a season/series never records history.
    if (watched) await recordEpisodesWatched(repositories, mediaItemId, episodeIds, watchedAt)
  }

  ipcMain.handle('library:list', async (_event, request: ListLibraryRequest): Promise<ListLibraryResponse> => {
    try {
      return { items: await listLibrary(repositories, request) }
    } catch (error) {
      console.error('[library] list failed', error)
      return { items: [] }
    }
  })

  ipcMain.handle(
    'library:getState',
    async (_event, request: GetLibraryStateRequest): Promise<GetLibraryStateResponse> => {
      try {
        const mediaItem = await repositories.mediaItems.findBySource(request.source, request.externalId)
        if (!mediaItem) return { mediaItem: null, libraryEntry: null }
        const libraryEntry = await repositories.libraryEntries.getByMediaItemId(mediaItem.id)
        return {
          mediaItem: toMediaItemDTO(mediaItem),
          libraryEntry: libraryEntry ? toLibraryEntryDTO(libraryEntry) : null
        }
      } catch (error) {
        console.error('[library] getState failed', error)
        return { mediaItem: null, libraryEntry: null }
      }
    }
  )

  ipcMain.handle('library:add', (_event, request: AddToLibraryRequest): Promise<IpcResult<LibraryStateResult>> =>
    resultOf(async () => {
      const mediaItem = await getOrCreateMediaItem(repositories, request.media)
      const libraryEntry = await ensureLibraryEntry(mediaItem.id)
      return { mediaItem: toMediaItemDTO(mediaItem), libraryEntry: toLibraryEntryDTO(libraryEntry) }
    })
  )

  ipcMain.handle('library:remove', (_event, request: RemoveFromLibraryRequest): Promise<IpcResult<null>> =>
    resultOf(async () => {
      const mediaItem = await repositories.mediaItems.findBySource(request.source, request.externalId)
      if (!mediaItem) return null
      const entry = await repositories.libraryEntries.getByMediaItemId(mediaItem.id)
      if (entry) await repositories.libraryEntries.remove(entry.id)
      return null
    })
  )

  ipcMain.handle(
    'library:setFavorite',
    (_event, request: SetFavoriteRequest): Promise<IpcResult<LibraryStateResult>> =>
      resultOf(async () => {
        const mediaItem = await getOrCreateMediaItem(repositories, request.media)
        const entry = await ensureLibraryEntry(mediaItem.id)
        const updated = await repositories.libraryEntries.setFavorite(entry.id, request.favorite)
        return {
          mediaItem: toMediaItemDTO(mediaItem),
          libraryEntry: toLibraryEntryDTO(mustExist(updated, 'Library entry disappeared while favoriting'))
        }
      })
  )

  ipcMain.handle('library:setNotes', (_event, request: SetNotesRequest): Promise<IpcResult<LibraryStateResult>> =>
    resultOf(async () => {
      const mediaItem = await getOrCreateMediaItem(repositories, request.media)
      const entry = await ensureLibraryEntry(mediaItem.id)
      const updated = await repositories.libraryEntries.setNotes(entry.id, request.notes)
      return {
        mediaItem: toMediaItemDTO(mediaItem),
        libraryEntry: toLibraryEntryDTO(mustExist(updated, 'Library entry disappeared while setting notes'))
      }
    })
  )

  ipcMain.handle(
    'library:setWatchStatus',
    (_event, request: SetWatchStatusRequest): Promise<IpcResult<LibraryStateResult>> =>
      resultOf(async () => {
        const mediaItem = await getOrCreateMediaItem(repositories, request.media)
        const entry = await ensureLibraryEntry(mediaItem.id)
        const wasCompleted = entry.watchStatus === 'completed'
        const updated = mustExist(
          await repositories.libraryEntries.updateStatus(entry.id, request.watchStatus),
          'Library entry disappeared while updating status'
        )

        // A movie's "watch" is the status transition itself (it has no
        // episodes of its own to record events for). Only a genuine
        // transition INTO 'completed' counts — repeatedly setting the same
        // status, or entering it for a TV/anime series (whose watches are
        // already tracked per-episode), should not log a duplicate event.
        if (mediaItem.type === 'movie' && request.watchStatus === 'completed' && !wasCompleted) {
          await recordMovieWatched(repositories, mediaItem.id, entry.id, updated.completedAt!)
        }

        return { mediaItem: toMediaItemDTO(mediaItem), libraryEntry: toLibraryEntryDTO(updated) }
      })
  )

  ipcMain.handle(
    'library:getEpisodeProgress',
    async (_event, request: GetEpisodeProgressRequest): Promise<GetEpisodeProgressResponse> => {
      try {
        const mediaItem = await repositories.mediaItems.findBySource(request.source, request.externalId)
        if (!mediaItem) return { episodes: {} }
        const season = await repositories.seasons.getByMediaItemAndNumber(mediaItem.id, request.seasonNumber)
        if (!season) return { episodes: {} }

        const episodesWithProgress = await repositories.episodes.listBySeasonWithProgress(season.id)
        const watchCounts = await repositories.watchEvents.getWatchCountsByEpisodeIds(
          episodesWithProgress.map((episode) => episode.id)
        )
        const episodes: Record<number, EpisodeProgressDTO> = {}
        for (const episode of episodesWithProgress) {
          if (episode.progress) {
            episodes[episode.episodeNumber] = toProgressDTO(episode.progress, watchCounts.get(episode.id) ?? 0)
          }
        }
        return { episodes }
      } catch (error) {
        console.error('[library] getEpisodeProgress failed', error)
        return { episodes: {} }
      }
    }
  )

  ipcMain.handle(
    'library:getEpisodeHistory',
    async (_event, request: GetEpisodeHistoryRequest): Promise<GetEpisodeHistoryResponse> => {
      try {
        const mediaItem = await repositories.mediaItems.findBySource(request.source, request.externalId)
        if (!mediaItem) return { history: [] }
        const season = await repositories.seasons.getByMediaItemAndNumber(mediaItem.id, request.seasonNumber)
        if (!season) return { history: [] }
        const episode = await repositories.episodes.getBySeasonAndNumber(season.id, request.episodeNumber)
        if (!episode) return { history: [] }
        const events = await repositories.watchEvents.listForEpisode(episode.id)
        return { history: events.map((event) => event.watchedAt) }
      } catch (error) {
        console.error('[library] getEpisodeHistory failed', error)
        return { history: [] }
      }
    }
  )

  ipcMain.handle(
    'library:getMovieHistory',
    async (_event, request: GetMovieHistoryRequest): Promise<GetMovieHistoryResponse> => {
      try {
        const mediaItem = await repositories.mediaItems.findBySource(request.source, request.externalId)
        if (!mediaItem) return { history: [] }
        const events = await repositories.watchEvents.listForMovie(mediaItem.id)
        return { history: events.map((event) => event.watchedAt) }
      } catch (error) {
        console.error('[library] getMovieHistory failed', error)
        return { history: [] }
      }
    }
  )

  ipcMain.handle(
    'library:getSeriesProgress',
    async (_event, request: GetSeriesProgressRequest): Promise<GetSeriesProgressResponse> => {
      try {
        const mediaItem = await repositories.mediaItems.findBySource(request.source, request.externalId)
        // No local media_item yet (never added to the library) — still
        // compute progress from provider-only data, which is all zeros.
        const placeholderMedia: NormalizedMedia = {
          externalId: request.externalId,
          source: request.source,
          mediaType: request.mediaType,
          title: '',
          originalTitle: null,
          poster: null,
          backdrop: null,
          description: null,
          releaseDate: null,
          status: null,
          genres: [],
          rating: null,
          numberOfSeasons: null,
          numberOfEpisodes: null
        }
        const progress = await computeSeriesProgress(repositories, metadataService, placeholderMedia, mediaItem?.id ?? -1)
        return { progress, error: null }
      } catch (error) {
        return { progress: null, error: toMessage(error) }
      }
    }
  )

  ipcMain.handle(
    'library:setEpisodeWatched',
    (_event, request: SetEpisodeWatchedRequest): Promise<IpcResult<SetEpisodeWatchedResult>> =>
      resultOf(async () => {
        const mediaItem = await getOrCreateMediaItem(repositories, request.media)
        const entry = await ensureLibraryEntry(mediaItem.id)
        const season = await getOrCreateSeason(repositories, mediaItem.id, request.seasonNumber)
        const episode = await getOrCreateEpisode(repositories, season.id, request.episodeNumber)

        let progress
        if (request.watched) {
          const watchedAt = new Date().toISOString()
          progress = await repositories.episodeProgress.markWatched(episode.id, watchedAt)
          await recordEpisodeWatched(repositories, mediaItem.id, episode.id, watchedAt)
        } else {
          progress = await repositories.episodeProgress.markUnwatched(episode.id)
        }

        await recomputeAndApplyStatus(
          repositories,
          metadataService,
          request.media,
          mediaItem.id,
          entry.id,
          entry.watchStatus
        )

        const watchCount = await repositories.watchEvents.countForEpisode(episode.id)

        return {
          progress: toProgressDTO(progress, watchCount),
          libraryEntry: toLibraryEntryDTO(await reloadLibraryEntry(entry.id))
        }
      })
  )

  ipcMain.handle(
    'library:rateEpisode',
    (_event, request: RateEpisodeRequest): Promise<IpcResult<EpisodeProgressDTO>> =>
      resultOf(async () => {
        const mediaItem = await getOrCreateMediaItem(repositories, request.media)
        const season = await getOrCreateSeason(repositories, mediaItem.id, request.seasonNumber)
        const episode = await getOrCreateEpisode(repositories, season.id, request.episodeNumber)
        const progress = await repositories.episodeProgress.rate(episode.id, request.rating)
        const watchCount = await repositories.watchEvents.countForEpisode(episode.id)
        return toProgressDTO(progress, watchCount)
      })
  )

  ipcMain.handle(
    'library:setEpisodeNotes',
    (_event, request: SetEpisodeNotesRequest): Promise<IpcResult<EpisodeProgressDTO>> =>
      resultOf(async () => {
        const mediaItem = await getOrCreateMediaItem(repositories, request.media)
        const season = await getOrCreateSeason(repositories, mediaItem.id, request.seasonNumber)
        const episode = await getOrCreateEpisode(repositories, season.id, request.episodeNumber)
        const progress = await repositories.episodeProgress.setNotes(episode.id, request.notes)
        const watchCount = await repositories.watchEvents.countForEpisode(episode.id)
        return toProgressDTO(progress, watchCount)
      })
  )

  ipcMain.handle(
    'library:rateMedia',
    (_event, request: RateMediaRequest): Promise<IpcResult<LibraryStateResult>> =>
      resultOf(async () => {
        const mediaItem = await getOrCreateMediaItem(repositories, request.media)
        const entry = await ensureLibraryEntry(mediaItem.id)
        const updated = await repositories.libraryEntries.rate(entry.id, request.rating)
        return {
          mediaItem: toMediaItemDTO(mediaItem),
          libraryEntry: toLibraryEntryDTO(mustExist(updated, 'Library entry disappeared while rating'))
        }
      })
  )

  ipcMain.handle(
    'library:rateSeason',
    (_event, request: RateSeasonRequest): Promise<IpcResult<GetSeasonRatingResponse>> =>
      resultOf(async () => {
        const mediaItem = await getOrCreateMediaItem(repositories, request.media)
        const season = await getOrCreateSeason(repositories, mediaItem.id, request.seasonNumber)
        const rating = await repositories.seasonRatings.rate(season.id, request.rating)
        return { rating: rating.rating, notes: rating.notes }
      })
  )

  ipcMain.handle(
    'library:setSeasonNotes',
    (_event, request: SetSeasonNotesRequest): Promise<IpcResult<GetSeasonRatingResponse>> =>
      resultOf(async () => {
        const mediaItem = await getOrCreateMediaItem(repositories, request.media)
        const season = await getOrCreateSeason(repositories, mediaItem.id, request.seasonNumber)
        const row = await repositories.seasonRatings.setNotes(season.id, request.notes)
        return { rating: row.rating, notes: row.notes }
      })
  )

  ipcMain.handle(
    'library:getSeasonRating',
    async (_event, request: GetSeasonRatingRequest): Promise<GetSeasonRatingResponse> => {
      try {
        const mediaItem = await repositories.mediaItems.findBySource(request.source, request.externalId)
        if (!mediaItem) return { rating: null, notes: null }
        const season = await repositories.seasons.getByMediaItemAndNumber(mediaItem.id, request.seasonNumber)
        if (!season) return { rating: null, notes: null }
        const row = await repositories.seasonRatings.getBySeasonId(season.id)
        return { rating: row?.rating ?? null, notes: row?.notes ?? null }
      } catch (error) {
        console.error('[library] getSeasonRating failed', error)
        return { rating: null, notes: null }
      }
    }
  )

  ipcMain.handle(
    'library:getSeriesRatingSummary',
    async (_event, request: GetSeriesRatingSummaryRequest): Promise<GetSeriesRatingSummaryResponse> => {
      try {
        const mediaItem = await repositories.mediaItems.findBySource(request.source, request.externalId)
        if (!mediaItem) return { summary: null }
        const libraryEntry = await repositories.libraryEntries.getByMediaItemId(mediaItem.id)
        const rollup = await computeSeriesRatingRollup(repositories, mediaItem.id)
        return {
          summary: {
            overallRating: libraryEntry?.rating ?? null,
            averageSeasonRating: rollup.averageSeasonRating,
            averageEpisodeRating: rollup.averageEpisodeRating
          }
        }
      } catch (error) {
        console.error('[library] getSeriesRatingSummary failed', error)
        return { summary: null }
      }
    }
  )

  ipcMain.handle(
    'library:setSeasonWatched',
    (_event, request: SetSeasonWatchedRequest): Promise<IpcResult<WatchMutationResult>> =>
      resultOf(async () => {
        const mediaItem = await getOrCreateMediaItem(repositories, request.media)
        const entry = await ensureLibraryEntry(mediaItem.id)

        const episodesResponse = await metadataService.getEpisodes(
          request.media.source,
          request.media.mediaType,
          request.media.externalId,
          request.seasonNumber
        )
        // Marking a whole season watched needs the provider's episode list
        // to know which numbers exist — unlike a single episode toggle,
        // this genuinely can't work offline. Fail loudly rather than
        // silently marking zero episodes and reporting success.
        if (episodesResponse.error) throw new Error(episodesResponse.error.message)
        const episodeNumbers = episodesResponse.episodes.map((episode) => episode.episodeNumber)
        await markSeasonEpisodesWatched(mediaItem.id, request.seasonNumber, episodeNumbers, request.watched)

        await recomputeAndApplyStatus(
          repositories,
          metadataService,
          request.media,
          mediaItem.id,
          entry.id,
          entry.watchStatus
        )
        return { libraryEntry: toLibraryEntryDTO(await reloadLibraryEntry(entry.id)) }
      })
  )

  ipcMain.handle(
    'library:setSeriesWatched',
    (_event, request: SetSeriesWatchedRequest): Promise<IpcResult<WatchMutationResult>> =>
      resultOf(async () => {
        const mediaItem = await getOrCreateMediaItem(repositories, request.media)
        const entry = await ensureLibraryEntry(mediaItem.id)

        const seasonsResponse = await metadataService.getSeasons(
          request.media.source,
          request.media.mediaType,
          request.media.externalId
        )
        // Same reasoning as setSeasonWatched: the season/episode lists are
        // essential inputs here, not optional — fail loudly rather than
        // silently marking nothing watched when the provider is unreachable.
        if (seasonsResponse.error) throw new Error(seasonsResponse.error.message)

        for (const season of seasonsResponse.seasons) {
          const episodesResponse = await metadataService.getEpisodes(
            request.media.source,
            request.media.mediaType,
            request.media.externalId,
            season.seasonNumber
          )
          if (episodesResponse.error) throw new Error(episodesResponse.error.message)
          const episodeNumbers = episodesResponse.episodes.map((episode) => episode.episodeNumber)
          await markSeasonEpisodesWatched(mediaItem.id, season.seasonNumber, episodeNumbers, request.watched)
        }

        await recomputeAndApplyStatus(
          repositories,
          metadataService,
          request.media,
          mediaItem.id,
          entry.id,
          entry.watchStatus
        )
        return { libraryEntry: toLibraryEntryDTO(await reloadLibraryEntry(entry.id)) }
      })
  )
}
