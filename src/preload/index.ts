import { contextBridge, ipcRenderer } from 'electron'
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
import type {
  AddToLibraryRequest,
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
  EpisodeProgressDTO,
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
import type {
  AttachTagRequest,
  DetachTagRequest,
  ListTagsForMediaRequest,
  ListTagsForMediaResponse,
  ListTagsResponse,
  TagsForMediaResult
} from '@shared/tags'
import type { GetDashboardResponse } from '@shared/dashboard'
import type { GetStatisticsResponse } from '@shared/statistics'
import type { GetWatchLogResponse } from '@shared/watchLog'
import type { ExportBackupResult, ImportBackupResult } from '@shared/backup'
import type { AppConfigDTO, DatabaseInfoDTO, DatabaseStatusDTO, SetTmdbApiKeyRequest } from '@shared/settings'
import type { IpcResult } from '@shared/ipcResult'

// The only surface the renderer ever sees. Nothing else from Node or
// Electron's main-process APIs is reachable from renderer code.
const api = {
  getAppVersion: (): Promise<string> => ipcRenderer.invoke('app:get-version'),

  searchMedia: (request: SearchMediaRequest): Promise<SearchMediaResponse> =>
    ipcRenderer.invoke('metadata:search', request),

  getMediaDetails: (request: GetMediaDetailsRequest): Promise<GetMediaDetailsResponse> =>
    ipcRenderer.invoke('metadata:getDetails', request),

  getSeasons: (request: GetSeasonsRequest): Promise<GetSeasonsResponse> =>
    ipcRenderer.invoke('metadata:getSeasons', request),

  getEpisodes: (request: GetEpisodesRequest): Promise<GetEpisodesResponse> =>
    ipcRenderer.invoke('metadata:getEpisodes', request),

  listLibrary: (request: ListLibraryRequest): Promise<ListLibraryResponse> =>
    ipcRenderer.invoke('library:list', request),

  getDashboard: (): Promise<GetDashboardResponse> => ipcRenderer.invoke('dashboard:get'),

  getLibraryState: (request: GetLibraryStateRequest): Promise<GetLibraryStateResponse> =>
    ipcRenderer.invoke('library:getState', request),

  addToLibrary: (request: AddToLibraryRequest): Promise<IpcResult<LibraryStateResult>> =>
    ipcRenderer.invoke('library:add', request),

  removeFromLibrary: (request: RemoveFromLibraryRequest): Promise<IpcResult<null>> =>
    ipcRenderer.invoke('library:remove', request),

  setFavorite: (request: SetFavoriteRequest): Promise<IpcResult<LibraryStateResult>> =>
    ipcRenderer.invoke('library:setFavorite', request),

  setWatchStatus: (request: SetWatchStatusRequest): Promise<IpcResult<LibraryStateResult>> =>
    ipcRenderer.invoke('library:setWatchStatus', request),

  getEpisodeProgress: (request: GetEpisodeProgressRequest): Promise<GetEpisodeProgressResponse> =>
    ipcRenderer.invoke('library:getEpisodeProgress', request),

  getSeriesProgress: (request: GetSeriesProgressRequest): Promise<GetSeriesProgressResponse> =>
    ipcRenderer.invoke('library:getSeriesProgress', request),

  setEpisodeWatched: (request: SetEpisodeWatchedRequest): Promise<IpcResult<SetEpisodeWatchedResult>> =>
    ipcRenderer.invoke('library:setEpisodeWatched', request),

  rateEpisode: (request: RateEpisodeRequest): Promise<IpcResult<EpisodeProgressDTO>> =>
    ipcRenderer.invoke('library:rateEpisode', request),

  setSeasonWatched: (request: SetSeasonWatchedRequest): Promise<IpcResult<WatchMutationResult>> =>
    ipcRenderer.invoke('library:setSeasonWatched', request),

  setSeriesWatched: (request: SetSeriesWatchedRequest): Promise<IpcResult<WatchMutationResult>> =>
    ipcRenderer.invoke('library:setSeriesWatched', request),

  rateMedia: (request: RateMediaRequest): Promise<IpcResult<LibraryStateResult>> =>
    ipcRenderer.invoke('library:rateMedia', request),

  rateSeason: (request: RateSeasonRequest): Promise<IpcResult<GetSeasonRatingResponse>> =>
    ipcRenderer.invoke('library:rateSeason', request),

  getSeasonRating: (request: GetSeasonRatingRequest): Promise<GetSeasonRatingResponse> =>
    ipcRenderer.invoke('library:getSeasonRating', request),

  getSeriesRatingSummary: (request: GetSeriesRatingSummaryRequest): Promise<GetSeriesRatingSummaryResponse> =>
    ipcRenderer.invoke('library:getSeriesRatingSummary', request),

  getEpisodeHistory: (request: GetEpisodeHistoryRequest): Promise<GetEpisodeHistoryResponse> =>
    ipcRenderer.invoke('library:getEpisodeHistory', request),

  getMovieHistory: (request: GetMovieHistoryRequest): Promise<GetMovieHistoryResponse> =>
    ipcRenderer.invoke('library:getMovieHistory', request),

  setNotes: (request: SetNotesRequest): Promise<IpcResult<LibraryStateResult>> =>
    ipcRenderer.invoke('library:setNotes', request),

  setSeasonNotes: (request: SetSeasonNotesRequest): Promise<IpcResult<GetSeasonRatingResponse>> =>
    ipcRenderer.invoke('library:setSeasonNotes', request),

  setEpisodeNotes: (request: SetEpisodeNotesRequest): Promise<IpcResult<EpisodeProgressDTO>> =>
    ipcRenderer.invoke('library:setEpisodeNotes', request),

  listTags: (): Promise<ListTagsResponse> => ipcRenderer.invoke('tags:list'),

  listTagsForMedia: (request: ListTagsForMediaRequest): Promise<ListTagsForMediaResponse> =>
    ipcRenderer.invoke('tags:listForMedia', request),

  attachTag: (request: AttachTagRequest): Promise<IpcResult<TagsForMediaResult>> =>
    ipcRenderer.invoke('tags:attachToMedia', request),

  detachTag: (request: DetachTagRequest): Promise<IpcResult<TagsForMediaResult>> =>
    ipcRenderer.invoke('tags:detachFromMedia', request),

  getStatistics: (): Promise<GetStatisticsResponse> => ipcRenderer.invoke('statistics:get'),

  getWatchLog: (): Promise<GetWatchLogResponse> => ipcRenderer.invoke('watchLog:get'),

  exportBackup: (): Promise<IpcResult<ExportBackupResult>> => ipcRenderer.invoke('backup:export'),

  importBackup: (): Promise<IpcResult<ImportBackupResult>> => ipcRenderer.invoke('backup:import'),

  getAppConfig: (): Promise<AppConfigDTO> => ipcRenderer.invoke('app:getConfig'),

  setTmdbApiKey: (request: SetTmdbApiKeyRequest): Promise<IpcResult<null>> =>
    ipcRenderer.invoke('app:setTmdbApiKey', request),

  getDatabaseInfo: (): Promise<DatabaseInfoDTO> => ipcRenderer.invoke('app:getDatabaseInfo'),

  getDatabaseStatus: (): Promise<DatabaseStatusDTO> => ipcRenderer.invoke('app:getDatabaseStatus'),

  quit: (): Promise<void> => ipcRenderer.invoke('app:quit')
}

// contextIsolation is always enabled on this app's BrowserWindow, so this is
// the only path exposing `api` to the renderer.
contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
