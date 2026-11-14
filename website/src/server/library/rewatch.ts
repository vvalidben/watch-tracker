import type { EditWatchDateRequest, LogWatchRequest, MediaIdentity } from '@shared/enhancements'
import { validateWatchDate } from '@shared/watchDates'
import type { Repositories } from '../db/repositories'
import type { MediaSearchService } from '../metadata'
import { getOrCreateEpisode, getOrCreateSeason } from './ensureLocalMedia'
import { recomputeAndApplyStatus } from './progress'
import { toMediaItemDTO } from './dto'
import { mediaItemToOfflineNormalizedMedia } from '@shared/offlineMedia'

async function tracked(repositories: Repositories, identity: MediaIdentity) {
  const media = await repositories.mediaItems.findBySource(identity.source, identity.externalId, identity.mediaType)
  if (!media) throw new Error('Add this title to your library first')
  const entry = await repositories.libraryEntries.getByMediaItemId(media.id)
  if (!entry) throw new Error('Add this title to your library first')
  return { media, entry }
}

export async function startRewatch(repositories: Repositories, identity: MediaIdentity): Promise<void> {
  return repositories.transaction(async () => {
    const { media, entry } = await tracked(repositories, identity)
    for (const season of await repositories.seasons.listByMediaItem(media.id)) {
      const episodes = await repositories.episodes.listBySeason(season.id)
      await repositories.episodeProgress.setManyWatched(episodes.map((episode) => episode.id), false)
    }
    await repositories.libraryEntries.updateStatus(entry.id, 'watching')
  })
}

async function reconcileWatchDates(repositories: Repositories, mediaItemId: number, episodeId: number | null): Promise<void> {
  if (episodeId !== null) {
    const events = await repositories.watchEvents.listForEpisode(episodeId)
    const progress = await repositories.episodeProgress.getByEpisodeId(episodeId)
    if (events.length && progress) await repositories.episodeProgress.setWatchedAt(episodeId, events.at(-1)!.watchedAt)
  } else {
    const entry = await repositories.libraryEntries.getByMediaItemId(mediaItemId)
    const events = await repositories.watchEvents.listForMovie(mediaItemId)
    if (entry && events.length) {
      await repositories.libraryEntries.setCompletedAt(entry.id, events.at(-1)!.watchedAt)
      await repositories.libraryEntries.setRewatchCount(entry.id, Math.max(0, events.length - 1))
    }
  }
}

export async function logWatch(repositories: Repositories, service: MediaSearchService, request: LogWatchRequest): Promise<void> {
  const watchedAt = validateWatchDate(request.watchedAt)
  const { media, entry } = await repositories.transaction(async () => {
    const { media, entry } = await tracked(repositories, request)
    let episodeId: number | null = null
    if (media.type !== 'movie') {
      if (!Number.isInteger(request.seasonNumber) || request.seasonNumber! < 0 || !Number.isInteger(request.episodeNumber) || request.episodeNumber! < 1) throw new Error('Choose a valid season and episode')
      if (media.type === 'anime' && request.seasonNumber !== 1) throw new Error('AniList titles have one season; choose season 1')
      const cachedSeason = await repositories.seasons.getByMediaItemAndNumber(media.id, request.seasonNumber!)
      if (cachedSeason?.episodesCachedAt && !await repositories.episodes.getBySeasonAndNumber(cachedSeason.id, request.episodeNumber!)) throw new Error('Choose an episode listed in this season, or refresh its metadata first')
      const season = await getOrCreateSeason(repositories, media.id, request.seasonNumber!)
      const episode = await getOrCreateEpisode(repositories, season.id, request.episodeNumber!)
      episodeId = episode.id
      await repositories.episodeProgress.markWatched(episodeId, watchedAt)
    } else await repositories.libraryEntries.updateStatus(entry.id, 'completed')
    await repositories.watchEvents.record(media.id, episodeId, watchedAt)
    await reconcileWatchDates(repositories, media.id, episodeId)
    return { media, entry }
  })
  const normalized = mediaItemToOfflineNormalizedMedia(toMediaItemDTO(media))
  if (normalized) await recomputeAndApplyStatus(repositories, service, normalized, media.id, entry.id, entry.watchStatus)
}

export async function editWatchDate(repositories: Repositories, request: EditWatchDateRequest): Promise<void> {
  return repositories.transaction(async () => {
    const watchedAt = validateWatchDate(request.watchedAt)
    const event = await repositories.watchEvents.getById(request.eventId)
    if (!event) throw new Error('Watch event no longer exists')
    await repositories.watchEvents.editDate(event.id, watchedAt)
    await reconcileWatchDates(repositories, event.mediaItemId, event.episodeId)
  })
}
