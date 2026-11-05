import { ipcMain } from 'electron'
import type { GetWatchLogResponse } from '@shared/watchLog'
import type { Repositories } from '../db/repositories'
import { computeWatchLog } from '../library/watchLog'

export function registerWatchLogIpc(repositories: Repositories): void {
  ipcMain.handle('watchLog:get', async (): Promise<GetWatchLogResponse> => {
    try {
      return await computeWatchLog(repositories)
    } catch (error) {
      console.error('[watchLog] get failed', error)
      return { entries: [] }
    }
  })
}
