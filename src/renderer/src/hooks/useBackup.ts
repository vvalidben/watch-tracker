import { useState } from 'react'

export type BackupActionStatus =
  | { kind: 'idle' }
  | { kind: 'pending' }
  | { kind: 'exported'; filePath: string }
  | { kind: 'restoring' }
  | { kind: 'cancelled' }
  | { kind: 'error'; message: string }

export interface UseBackupResult {
  status: BackupActionStatus
  exportBackup: () => Promise<void>
  importBackup: () => Promise<void>
}

/** Drives the Settings page's backup/restore actions. All the real work happens in the main process. */
export function useBackup(): UseBackupResult {
  const [status, setStatus] = useState<BackupActionStatus>({ kind: 'idle' })

  async function exportBackup(): Promise<void> {
    setStatus({ kind: 'pending' })
    const result = await window.api.exportBackup()
    if (!result.ok) {
      setStatus({ kind: 'error', message: result.error })
      return
    }
    if (result.data.cancelled || !result.data.filePath) {
      setStatus({ kind: 'cancelled' })
      return
    }
    setStatus({ kind: 'exported', filePath: result.data.filePath })
  }

  async function importBackup(): Promise<void> {
    setStatus({ kind: 'pending' })
    const result = await window.api.importBackup()
    if (!result.ok) {
      setStatus({ kind: 'error', message: result.error })
      return
    }
    if (result.data.cancelled) {
      setStatus({ kind: 'cancelled' })
      return
    }
    // result.data.restarting is true here — the app is about to relaunch on its own.
    setStatus({ kind: 'restoring' })
  }

  return { status, exportBackup, importBackup }
}
