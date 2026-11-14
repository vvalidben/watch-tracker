import type { UpcomingEpisode } from '@shared/enhancements'
import type { Repositories } from '../db/repositories'

/** A local read over saved episode air dates; no surprise network requests. */
export async function listUpcomingEpisodes(repositories: Repositories, now = new Date()): Promise<UpcomingEpisode[]> {
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const result: UpcomingEpisode[] = []
  const entries = await repositories.libraryEntries.listWithMedia()
  for (const entry of entries) {
    const media = entry.mediaItem
    if (media.type === 'movie' || media.source === 'manual' || !media.sourceId || ['dropped', 'on_hold'].includes(entry.watchStatus)) continue
    for (const season of await repositories.seasons.listByMediaItem(media.id)) {
      if (season.seasonNumber === 0) continue
      for (const episode of await repositories.episodes.listBySeasonWithProgress(season.id)) {
        if (!episode.airDate || episode.progress?.watched || !/^\d{4}-\d{2}-\d{2}$/.test(episode.airDate)) continue
        result.push({ source: media.source, mediaType: media.type, externalId: media.sourceId, title: media.title,
          seasonNumber: season.seasonNumber, episodeNumber: episode.episodeNumber, episodeTitle: episode.title,
          airDate: episode.airDate, available: episode.airDate <= today })
      }
    }
  }
  return result.sort((a, b) => a.airDate.localeCompare(b.airDate) || a.title.localeCompare(b.title) || a.seasonNumber - b.seasonNumber || a.episodeNumber - b.episodeNumber)
}
