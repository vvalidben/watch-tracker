import { ipcMain } from 'electron'
import type { GetStatisticsResponse } from '@shared/statistics'
import type { Repositories } from '../db/repositories'
import { computeLibraryStatistics } from '../library/statistics'

export function registerStatisticsIpc(repositories: Repositories): void {
  ipcMain.handle('statistics:get', async (): Promise<GetStatisticsResponse> => {
    try {
      return await computeLibraryStatistics(repositories)
    } catch (error) {
      console.error('[statistics] get failed', error)
      return {
        statistics: {
          overview: {
            moviesWatched: 0,
            seriesCompleted: 0,
            animeCompleted: 0,
            totalEpisodesWatched: 0,
            estimatedWatchTimeMinutes: 0,
            averagePersonalRating: null,
            favoritesCount: 0
          },
          highestRated: [],
          lowestRated: [],
          episodesByMonth: [],
          moviesByMonth: [],
          completion: { byStatus: [], completionRate: null, totalInLibrary: 0 },
          favoriteGenres: []
        }
      }
    }
  })
}
