import { ipcMain } from 'electron'
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

export function registerMetadataIpc(searchService: MediaSearchService): void {
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
        return await searchService.getDetails(request.source, request.mediaType, request.externalId)
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
        return await searchService.getSeasons(request.source, request.mediaType, request.externalId)
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
        return await searchService.getEpisodes(
          request.source,
          request.mediaType,
          request.externalId,
          request.seasonNumber
        )
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
