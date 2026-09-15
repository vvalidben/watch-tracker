import { ipcMain } from 'electron'
import type { GetDashboardResponse } from '@shared/dashboard'
import type { Repositories } from '../db/repositories'
import { computeDashboard } from '../library/dashboard'

export function registerDashboardIpc(repositories: Repositories): void {
  ipcMain.handle('dashboard:get', async (): Promise<GetDashboardResponse> => {
    try {
      return await computeDashboard(repositories)
    } catch (error) {
      console.error('[dashboard] get failed', error)
      return {
        stats: {
          moviesWatched: 0,
          seriesCompleted: 0,
          animeCompleted: 0,
          totalEpisodesWatched: 0,
          estimatedWatchTimeMinutes: 0,
          averagePersonalRating: null,
          favoritesCount: 0
        },
        shelves: {
          continueWatching: [],
          recentlyWatched: [],
          recentlyAdded: [],
          favorites: [],
          highestRated: [],
          watchlist: []
        }
      }
    }
  })
}
