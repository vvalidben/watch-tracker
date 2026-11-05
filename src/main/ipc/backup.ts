import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { parseBackupFile, type ExportBackupResult, type ImportBackupResult } from '@shared/backup'
import type { IpcResult } from '@shared/ipcResult'
import type { AppDatabase } from '../db/client'
import { readAppConfig, writeAppConfig } from '../config/appConfig'
import { buildBackupFile } from '../backup/exportBackup'
import { restoreBackup } from '../backup/importBackup'

export interface BackupIpcContext {
  db: AppDatabase
  dbPath: string
  migrationsFolder: string
  configPath: string
}

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function defaultBackupFileName(): string {
  const now = new Date()
  const date = now.toISOString().slice(0, 10)
  return `watch-tracker-backup-${date}.json`
}

export function registerBackupIpc(context: BackupIpcContext): void {
  ipcMain.handle('backup:export', async (): Promise<IpcResult<ExportBackupResult>> => {
    try {
      const window = BrowserWindow.getFocusedWindow() ?? undefined
      const config = readAppConfig(context.configPath)
      const dialogOptions = {
        title: 'Save Backup',
        defaultPath: config.defaultBackupDirectory
          ? join(config.defaultBackupDirectory, defaultBackupFileName())
          : defaultBackupFileName(),
        filters: [{ name: 'Watch Tracker Backup', extensions: ['json'] }]
      }
      const { canceled, filePath } = window
        ? await dialog.showSaveDialog(window, dialogOptions)
        : await dialog.showSaveDialog(dialogOptions)

      if (canceled || !filePath) {
        return { ok: true, data: { cancelled: true, filePath: null } }
      }

      const backup = await buildBackupFile(context.db, app.getVersion())
      writeFileSync(filePath, JSON.stringify(backup, null, 2), 'utf-8')
      writeAppConfig(context.configPath, { ...config, defaultBackupDirectory: dirname(filePath) })

      return { ok: true, data: { cancelled: false, filePath } }
    } catch (error) {
      console.error('[backup] export failed', error)
      return { ok: false, error: toMessage(error) }
    }
  })

  ipcMain.handle('backup:import', async (): Promise<IpcResult<ImportBackupResult>> => {
    try {
      const window = BrowserWindow.getFocusedWindow() ?? undefined
      const config = readAppConfig(context.configPath)
      const dialogOptions = {
        title: 'Restore Backup',
        defaultPath: config.defaultBackupDirectory ?? undefined,
        properties: ['openFile'] as Array<'openFile'>,
        filters: [{ name: 'Watch Tracker Backup', extensions: ['json'] }]
      }
      const { canceled, filePaths } = window
        ? await dialog.showOpenDialog(window, dialogOptions)
        : await dialog.showOpenDialog(dialogOptions)

      if (canceled || filePaths.length === 0) {
        return { ok: true, data: { cancelled: true, restarting: false, exportedAt: null } }
      }

      let raw: unknown
      try {
        raw = JSON.parse(readFileSync(filePaths[0], 'utf-8'))
      } catch {
        return { ok: false, error: 'That file is not valid JSON — it may be corrupted or not a backup file at all.' }
      }

      const parsed = parseBackupFile(raw)
      if (!parsed.ok) {
        return { ok: false, error: parsed.error }
      }

      const confirmation = {
        type: 'warning' as const,
        buttons: ['Cancel', 'Restore'],
        defaultId: 0,
        cancelId: 0,
        title: 'Restore Backup',
        message: 'This will replace all current data in Watch Tracker.',
        detail: `Restoring the backup taken on ${new Date(parsed.backup.exportedAt).toLocaleString()} cannot be undone. The app will restart afterward.`
      }
      const { response } = window
        ? await dialog.showMessageBox(window, confirmation)
        : await dialog.showMessageBox(confirmation)

      if (response !== 1) {
        return { ok: true, data: { cancelled: true, restarting: false, exportedAt: null } }
      }

      // A backup can predate the anime title backfill, so let it run again after the restart.
      writeAppConfig(context.configPath, { ...config, defaultBackupDirectory: dirname(filePaths[0]), animeTitleBackfillDone: false })
      await restoreBackup(parsed.backup, { migrationsFolder: context.migrationsFolder, targetDbPath: context.dbPath })

      // Relaunch after replying, so the renderer gets a chance to show the
      // "restarting" message before the window disappears.
      setTimeout(() => {
        app.relaunch()
        app.exit(0)
      }, 400)

      return { ok: true, data: { cancelled: false, restarting: true, exportedAt: parsed.backup.exportedAt } }
    } catch (error) {
      console.error('[backup] import failed', error)
      return { ok: false, error: toMessage(error) }
    }
  })
}
