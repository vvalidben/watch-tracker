import { ConfirmDialog } from '@renderer/components/neon/ConfirmDialog'
import { useBackup } from '@renderer/hooks/useBackup'
import { useAppConfig } from '@renderer/hooks/useAppConfig'

export function BackupCard(): JSX.Element {
  const { status, exportBackup, importBackup } = useBackup()
  const { config } = useAppConfig()
  const pending = status.kind === 'pending' || status.kind === 'restoring'

  let message: string | null = config?.defaultBackupDirectory ? `Backups default to ${config.defaultBackupDirectory}` : null
  if (status.kind === 'exported') message = `Backup written: ${status.filePath}`
  if (status.kind === 'restoring') message = 'Restoring your backup. The app will restart automatically in a moment.'
  if (status.kind === 'error') message = status.message

  return (
    <div className="wt-panel wt-stack wt-rise" style={{ padding: 24, gap: 12, animationDelay: '180ms' }}>
      <h2 className="wt-h3">Backup &amp; restore</h2>
      <span className="wt-sub">One dated JSON file, kept on this computer. Restoring replaces the whole library.</span>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button type="button" className="wt-btn wt-btn-yellow" disabled={pending} onClick={() => void exportBackup()}>
          Create backup
        </button>
        <ConfirmDialog
          trigger={
            <button type="button" className="wt-ghost" disabled={pending} style={{ padding: '10px 18px' }}>
              Restore from backup
            </button>
          }
          title="Restore from backup?"
          description="This replaces your entire library with the backup's contents, then restarts the app. Choose a file next, and you'll get one more chance to cancel before anything changes."
          confirmLabel="Choose file"
          onConfirm={() => void importBackup()}
        />
      </div>
      {message && (
        <span style={{ fontSize: 12, color: status.kind === 'error' ? 'var(--wt-a1)' : 'var(--wt-muted)', wordBreak: 'break-all' }}>{message}</span>
      )}
    </div>
  )
}
