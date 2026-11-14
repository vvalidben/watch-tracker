import { useEffect, useState } from 'react'
import type { AutomaticBackupDTO } from '@shared/enhancements'
import { formatBytes } from '@renderer/lib/formatBytes'

export function AutomaticBackupsCard(): JSX.Element {
  const [backups, setBackups] = useState<AutomaticBackupDTO[]>([])
  const [directory, setDirectory] = useState('')
  const [selected, setSelected] = useState('')
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    window.api.listAutomaticBackups().then((result) => {
      if (cancelled) return
      if (result.ok) { setBackups(result.data.backups); setDirectory(result.data.directory); setSelected(result.data.backups[0]?.name ?? '') }
      else setMessage(result.error)
    }).catch((error) => { if (!cancelled) setMessage(String(error)) })
    return () => { cancelled = true }
  }, [])
  return <div className="wt-panel wt-stack" style={{ padding: 24, gap: 12 }}>
    <h2 className="wt-h3">Automatic safety backups</h2>
    <span className="wt-sub">Browse recent cloud safety snapshots saved with library updates. Restoring keeps a new snapshot of your current library.</span>
    {directory && <span className="wt-sub" style={{ overflowWrap: 'anywhere' }}>{directory}</span>}
    {backups.length ? <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      <select className="wt-select" aria-label="Automatic backup" style={{ flex: 1, minWidth: 0 }} value={selected} disabled={pending} onChange={(event) => setSelected(event.target.value)}>
        {backups.map((backup) => <option key={backup.name} value={backup.name}>{new Date(backup.createdAt).toLocaleString()} · {'Cloud snapshot'} · {formatBytes(backup.sizeBytes)}</option>)}
      </select>
      <button className="wt-btn wt-btn-yellow" disabled={!selected || pending} onClick={async () => {
        setPending(true); setMessage(null)
        try {
          const result = await window.api.restoreAutomaticBackup(selected)
          setMessage(result.ok ? result.data.restarting ? 'Restoring backup. Restarting…' : 'Restore cancelled.' : result.error)
          if (result.ok && result.data.restarting) return
        } catch (error) { setMessage(error instanceof Error ? error.message : String(error)) }
        setPending(false)
      }}>Restore selected snapshot</button>
    </div> : <span className="wt-sub">Snapshots appear after your library starts changing.</span>}
    {message && <span role="status" style={{ fontSize: 13 }}>{message}</span>}
  </div>
}
