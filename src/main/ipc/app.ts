import { ipcMain } from 'electron'
import { existsSync, statSync } from 'node:fs'
import type { AppConfigDTO, DatabaseInfoDTO, SetTmdbApiKeyRequest } from '@shared/settings'
import type { IpcResult } from '@shared/ipcResult'
import type { Repositories } from '../db/repositories'
import { readAppConfig, writeAppConfig } from '../config/appConfig'

export interface AppIpcContext {
  repositories: Repositories
  dbPath: string
  configPath: string
}

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function registerAppIpc(context: AppIpcContext): void {
  ipcMain.handle('app:getConfig', (): AppConfigDTO => {
    const config = readAppConfig(context.configPath)
    return {
      tmdbApiKey: config.tmdbApiKey,
      tmdbConfiguredViaEnv: !config.tmdbApiKey && Boolean(process.env.TMDB_API_KEY),
      defaultBackupDirectory: config.defaultBackupDirectory
    }
  })

  ipcMain.handle('app:setTmdbApiKey', (_event, request: SetTmdbApiKeyRequest): IpcResult<null> => {
    try {
      const config = readAppConfig(context.configPath)
      const trimmed = request.apiKey?.trim() || null
      writeAppConfig(context.configPath, { ...config, tmdbApiKey: trimmed })
      return { ok: true, data: null }
    } catch (error) {
      return { ok: false, error: toMessage(error) }
    }
  })

  ipcMain.handle('app:getDatabaseInfo', async (): Promise<DatabaseInfoDTO> => {
    const stats = existsSync(context.dbPath) ? statSync(context.dbPath) : null
    const [mediaItems, libraryEntries] = await Promise.all([
      context.repositories.mediaItems.list(),
      context.repositories.libraryEntries.list()
    ])
    return {
      filePath: context.dbPath,
      fileSizeBytes: stats?.size ?? 0,
      mediaItemCount: mediaItems.length,
      libraryEntryCount: libraryEntries.length
    }
  })
}
