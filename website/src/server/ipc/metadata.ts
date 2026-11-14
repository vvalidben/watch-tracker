import { authenticatedIpc as ipcMain } from './authenticatedIpc'
import type {
  GetEpisodesRequest,
  GetEpisodesResponse,
  GetMediaDetailsRequest,
  GetMediaDetailsResponse,
  GetSeasonsRequest,
  GetSeasonsResponse,
  SearchMediaRequest,
  SearchMediaResponse
} from '@shared/metadata'
import type { MediaSearchService } from '../metadata'
import type { Repositories } from '../db/repositories'
import { saveEpisodeMetadata, saveMediaMetadata, saveSeasonMetadata } from '../library/refreshMetadata'

export function registerMetadataIpc(searchService: MediaSearchService, repositories: Repositories): void {
  ipcMain.handle('metadata:search', async (_event, request: SearchMediaRequest): Promise<SearchMediaResponse> => {
    try {
      return await searchService.search(request.query, request.types)
    } catch (error) {
      return {
        results: [],
        errors: [
          {
            source: 'tmdb',
            code: 'unknown',
            message: error instanceof Error ? error.message : String(error)
          }
        ]
      }
    }
  })

  ipcMain.handle(
    'metadata:getDetails',
    async (_event, request: GetMediaDetailsRequest): Promise<GetMediaDetailsResponse> => {
      try {
        const response = await searchService.getDetails(request.source, request.mediaType, request.externalId)
        if (response.result) await saveMediaMetadata(repositories, response.result)
        return response
      } catch (error) {
        return {
          result: null,
          error: {
            source: request.source,
            code: 'unknown',
            message: error instanceof Error ? error.message : String(error)
          }
        }
      }
    }
  )

  ipcMain.handle(
    'metadata:getSeasons',
    async (_event, request: GetSeasonsRequest): Promise<GetSeasonsResponse> => {
      try {
        const response = await searchService.getSeasons(request.source, request.mediaType, request.externalId)
        if (!response.error) await saveSeasonMetadata(repositories, request, response.seasons)
        return response
      } catch (error) {
        return {
          seasons: [],
          error: {
            source: request.source,
            code: 'unknown',
            message: error instanceof Error ? error.message : String(error)
          }
        }
      }
    }
  )

  ipcMain.handle(
    'metadata:getEpisodes',
    async (_event, request: GetEpisodesRequest): Promise<GetEpisodesResponse> => {
      try {
        const response = await searchService.getEpisodes(
          request.source,
          request.mediaType,
          request.externalId,
          request.seasonNumber
        )
        if (!response.error) await saveEpisodeMetadata(repositories, request, request.seasonNumber, response.episodes)
        return response
      } catch (error) {
        return {
          episodes: [],
          error: {
            source: request.source,
            code: 'unknown',
            message: error instanceof Error ? error.message : String(error)
          }
        }
      }
    }
  )
}
