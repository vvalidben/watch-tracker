import type { GetWatchLogResponse, WatchLogEntry } from '@shared/watchLog'
import type { Repositories } from '../db/repositories'
import { listLibrary } from './libraryView'

/**
 * Entirely local. Scoped to titles currently in the library, the same as
 * Statistics, so the two pages can't disagree about what's been watched.
 * Marking something unwatched doesn't erase a day it was watched on: this is
 * the same append-only history the monthly charts count.
 */
export async function computeWatchLog(repositories: Repositories): Promise<GetWatchLogResponse> {
  const items = await listLibrary(repositories, {})
  const mediaById = new Map(items.map((item) => [item.mediaItem.id, item.mediaItem]))
  const events = await repositories.watchEvents.listLogForMediaItems([...mediaById.keys()])

  const entries: WatchLogEntry[] = []
  for (const event of events) {
    const media = mediaById.get(event.mediaItemId)
    if (!media) continue
    entries.push({
      mediaItemId: media.id,
      title: media.title,
      mediaType: media.type,
      source: media.source,
      sourceId: media.sourceId,
      numberOfSeasons: media.numberOfSeasons,
      watchedAt: event.watchedAt,
      seasonNumber: event.seasonNumber,
      episodeNumber: event.episodeNumber
    })
  }
  return { entries }
}
