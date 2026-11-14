import type { MediaType, MetadataSource, NormalizedEpisode, NormalizedMedia, NormalizedSeason } from '@shared/metadata'

export interface MediaSearchProvider {
  readonly source: MetadataSource
  readonly supportedTypes: readonly MediaType[]
  search(query: string, type: MediaType): Promise<NormalizedMedia[]>
  getDetails(externalId: string, type: MediaType, refresh?: boolean): Promise<NormalizedMedia>
  /** Empty array for a movie, or any type this provider doesn't cover. */
  getSeasons(externalId: string, type: MediaType, refresh?: boolean): Promise<NormalizedSeason[]>
  getEpisodes(externalId: string, type: MediaType, seasonNumber: number, refresh?: boolean): Promise<NormalizedEpisode[]>
}
