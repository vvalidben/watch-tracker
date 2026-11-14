import type { Repositories } from '../db/repositories'
import type { MediaSearchService } from './searchService'

/** The SQLite copy travels with backups, so restored libraries retain offline episode access. */
export function withLocalMetadata(service: MediaSearchService, repositories: Repositories): MediaSearchService {
  return {
    ...service,
    async getSeasons(source, type, externalId, refresh = false) {
      if (!refresh) {
        const media = await repositories.mediaItems.findBySource(source, externalId, type)
        const seasons = media ? await repositories.seasons.listByMediaItem(media.id) : []
        const cached = seasons.filter((season) => season.metadataCachedAt)
        if (cached.length) return { seasons: cached.map((season) => ({ seasonNumber: season.seasonNumber, title: season.title,
          overview: season.overview, poster: season.posterPath, airDate: season.airDate, episodeCount: season.episodeCount })), error: null }
      }
      return refresh ? service.getSeasons(source, type, externalId, true) : service.getSeasons(source, type, externalId)
    },
    async getEpisodes(source, type, externalId, number, refresh = false) {
      if (!refresh) {
        const media = await repositories.mediaItems.findBySource(source, externalId, type)
        const season = media ? await repositories.seasons.getByMediaItemAndNumber(media.id, number) : undefined
        if (season?.episodesCachedAt) {
          const episodes = await repositories.episodes.listBySeason(season.id)
          return { episodes: episodes.map((episode) => ({ episodeNumber: episode.episodeNumber, title: episode.title,
            overview: episode.overview, airDate: episode.airDate, runtimeMinutes: episode.runtimeMinutes })), error: null }
        }
      }
      return refresh ? service.getEpisodes(source, type, externalId, number, true) : service.getEpisodes(source, type, externalId, number)
    }
  }
}
