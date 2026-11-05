import 'dotenv/config'
import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { join } from 'path'
import { openDatabaseWithRecovery } from './db/recovery'
import { createRepositories, type Repositories } from './db/repositories'
import { createMetadataService } from './metadata'
import { readAppConfig } from './config/appConfig'
import { registerMetadataIpc } from './ipc/metadata'
import { registerLibraryIpc } from './ipc/library'
import { registerDashboardIpc } from './ipc/dashboard'
import { registerTagsIpc } from './ipc/tags'
import { registerStatisticsIpc } from './ipc/statistics'
import { registerWatchLogIpc } from './ipc/watchLog'
import { registerBackupIpc } from './ipc/backup'
import { registerAppIpc } from './ipc/app'
import { runAnimeTitleBackfillOnce } from './library/backfillOriginalTitles'
import { fetchAniListTitleNames } from './metadata/anilistProvider'
import type { AppDatabase } from './db/client'
import type { DatabaseStatusDTO } from '@shared/settings'

let repositories: Repositories | undefined

interface DatabaseHandle {
  repositories: Repositories
  db: AppDatabase
  dbPath: string
  migrationsFolder: string
  recoveredFrom: string | null
}

async function initDatabase(): Promise<DatabaseHandle> {
  const dbPath = join(app.getPath('userData'), 'watch-tracker.db')
  const migrationsFolder = join(app.getAppPath(), 'drizzle/migrations')
  const { opened, recoveredFrom } = await openDatabaseWithRecovery({ filePath: dbPath, migrationsFolder })
  console.log(`[db] ready at ${dbPath}`)
  return {
    repositories: createRepositories({ db: opened.db, persist: opened.persist }),
    db: opened.db,
    dbPath,
    migrationsFolder,
    recoveredFrom
  }
}

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

// Electron's default behavior for an uncaught main-process exception is to
// crash the whole app with no explanation. For a desktop app holding a
// user's only copy of their data, silently disappearing is worse than a
// visible error — log it and tell the user, but don't force-quit: most
// main-process errors (a failed IPC handler, a rejected background fetch)
// don't actually corrupt in-memory state, and the user's window/data are
// often still fine to keep working with or back up before restarting.
process.on('uncaughtException', (error) => {
  console.error('[process] uncaught exception', error)
  dialog.showErrorBox('Watch Tracker hit an unexpected error', error.message)
})

process.on('unhandledRejection', (reason) => {
  console.error('[process] unhandled promise rejection', reason)
})

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    // Packaged Windows/macOS builds get their icon from the installer/exe
    // resource instead (see electron-builder.yml); this only matters for
    // `npm run dev`'s taskbar icon and for Linux, where there is no such
    // resource embedding.
    icon: join(app.getAppPath(), 'build/icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // Any link that would open a new window (e.g. target="_blank") is handed
  // off to the OS browser instead of creating an unmanaged Electron window.
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Defense in depth: this app never navigates itself anywhere after the
  // initial load, so block any attempt to (e.g. a compromised renderer, a
  // stray full-page navigation) and send external targets to the OS browser
  // instead of letting the app window browse away from its own UI.
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const isDevServer = Boolean(process.env['ELECTRON_RENDERER_URL']) && url.startsWith(process.env['ELECTRON_RENDERER_URL']!)
    const isAppFile = url.startsWith('file://')
    if (isDevServer || isAppFile) return
    event.preventDefault()
    shell.openExternal(url)
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

ipcMain.handle('app:get-version', () => app.getVersion())

// Gives the packaged app its own taskbar/notification identity on Windows
// (must match the NSIS appId in electron-builder.yml) instead of being
// grouped under a generic Electron icon.
if (process.platform === 'win32') {
  app.setAppUserModelId('com.watchtracker.app')
}

app
  .whenReady()
  .then(async () => {
    const configPath = join(app.getPath('userData'), 'app-config.json')
    const config = readAppConfig(configPath)
    const dbPath = join(app.getPath('userData'), 'watch-tracker.db')

    const metadataService = createMetadataService(config.tmdbApiKey)
    registerMetadataIpc(metadataService)

    let databaseStatus: DatabaseStatusDTO
    try {
      const handle = await initDatabase()
      repositories = handle.repositories
      const libraryCount = (await repositories.libraryEntries.list()).length
      console.log(`[db] library has ${libraryCount} entries`)
      registerLibraryIpc(repositories, metadataService)
      registerDashboardIpc(repositories)
      registerTagsIpc(repositories)
      registerStatisticsIpc(repositories)
      registerWatchLogIpc(repositories)
      registerBackupIpc({ db: handle.db, dbPath: handle.dbPath, migrationsFolder: handle.migrationsFolder, configPath })
      registerAppIpc({ repositories, dbPath: handle.dbPath, configPath })
      // Runs in the background so a slow or missing connection can't hold up the window.
      void runAnimeTitleBackfillOnce({
        repositories,
        configPath,
        fetchTitles: (ids) => fetchAniListTitleNames(ids, { apiUrl: process.env.ANILIST_API_URL })
      })
      databaseStatus = {
        ok: true,
        recoveredFromCorruption: handle.recoveredFrom !== null,
        corruptedFilePath: handle.recoveredFrom,
        error: null,
        dbPath
      }
    } catch (error) {
      // The database is unusable and nothing above got registered — the
      // renderer still needs a way to find this out (see App.tsx), rather
      // than every individual page failing with a confusing "no handler
      // registered" error.
      console.error('[db] failed to initialize', error)
      databaseStatus = {
        ok: false,
        recoveredFromCorruption: false,
        corruptedFilePath: null,
        error: toMessage(error),
        dbPath
      }
    }

    ipcMain.handle('app:getDatabaseStatus', (): DatabaseStatusDTO => databaseStatus)
    ipcMain.handle('app:quit', () => app.quit())

    createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })
  .catch((error: unknown) => {
    console.error('[app] fatal startup error', error)
    dialog.showErrorBox('Watch Tracker failed to start', toMessage(error))
    app.quit()
  })

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
