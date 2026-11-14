import type { MediaIdentity, RefreshMetadataResult } from '@shared/enhancements'
import type { NormalizedEpisode, NormalizedMedia, NormalizedSeason } from '@shared/metadata'
import type { Repositories } from '../db/repositories'
import type { MediaSearchService } from '../metadata'
import { getOrCreateSeason } from './ensureLocalMedia'

/** Update only provider-owned columns, preserving all personal data and stable local IDs. */
export async function saveMediaMetadata(repositories: Repositories, media: NormalizedMedia): Promise<void> {
  const item = await repositories.mediaItems.findBySource(media.source, media.externalId, media.mediaType)
  if (!item) return
  await repositories.mediaItems.update(item.id, {
    title: media.title, originalTitle: media.originalTitle, romajiTitle: media.romajiTitle ?? null,
    overview: media.description, posterPath: media.poster, backdropPath: media.backdrop,
    releaseDate: media.releaseDate, airingStatus: media.status, runtimeMinutes: media.runtime ?? null,
    genres: media.genres, numberOfSeasons: media.numberOfSeasons, numberOfEpisodes: media.numberOfEpisodes,
    externalIds: media.externalIds ?? null
  })
}

export async function saveSeasonMetadata(repositories: Repositories, identity: MediaIdentity, metadata: NormalizedSeason[]): Promise<void> {
  const item = await repositories.mediaItems.findBySource(identity.source, identity.externalId, identity.mediaType)
  if (!item) return
  for (const data of metadata) {
    const season = await getOrCreateSeason(repositories, item.id, data.seasonNumber)
    await repositories.seasons.update(season.id, { title: data.title, overview: data.overview, posterPath: data.poster, airDate: data.airDate,
      episodeCount: data.episodeCount, metadataCachedAt: new Date().toISOString() })
  }
}

export async function saveEpisodeMetadata(repositories: Repositories, identity: MediaIdentity, seasonNumber: number, metadata: NormalizedEpisode[]): Promise<void> {
  const item = await repositories.mediaItems.findBySource(identity.source, identity.externalId, identity.mediaType)
  if (!item) return
  const season = await getOrCreateSeason(repositories, item.id, seasonNumber)
  await repositories.episodes.saveMetadata(season.id, metadata.map((data) => ({
    episodeNumber: data.episodeNumber, title: data.title, overview: data.overview, airDate: data.airDate, runtimeMinutes: data.runtimeMinutes
  })))
  await repositories.seasons.update(season.id, { episodesCachedAt: new Date().toISOString() })
}

export async function refreshMetadata(repositories: Repositories, service: MediaSearchService, identity: MediaIdentity): Promise<RefreshMetadataResult> {
  const details = await service.getDetails(identity.source, identity.mediaType, identity.externalId, true)
  if (!details.result) throw new Error(details.error?.message ?? 'Could not refresh this title')
  await saveMediaMetadata(repositories, details.result)
  const warnings: string[] = []
  let episodesCached = 0
  if (identity.mediaType !== 'movie') {
    const seasons = await service.getSeasons(identity.source, identity.mediaType, identity.externalId, true)
    if (seasons.error) warnings.push(seasons.error.message)
    else {
      await saveSeasonMetadata(repositories, identity, seasons.seasons)
      for (const season of seasons.seasons) {
        const response = await service.getEpisodes(identity.source, identity.mediaType, identity.externalId, season.seasonNumber, true)
        if (response.error) warnings.push(`Season ${season.seasonNumber}: ${response.error.message}`)
        else {
          await saveEpisodeMetadata(repositories, identity, season.seasonNumber, response.episodes)
          episodesCached += response.episodes.length
        }
      }
    }
  }
  return { media: details.result, episodesCached, warnings }
}
