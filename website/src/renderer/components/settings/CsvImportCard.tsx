import { useState } from 'react'
import type { ImportDuplicateMode, ImportPreview } from '@shared/enhancements'
import { invalidateWatchLog } from '@renderer/hooks/useWatchLog'

export function CsvImportCard({ onImported }: { onImported?: () => void }): JSX.Element {
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [mode, setMode] = useState<ImportDuplicateMode>('skip')
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  async function choose(): Promise<void> {
    setPending(true); setMessage(null)
    try {
      const result = await window.api.previewCsvImport()
      if (result.ok) setPreview(result.data); else setMessage(result.error)
    } catch (error) { setMessage(error instanceof Error ? error.message : String(error)) }
    finally { setPending(false) }
  }
  async function apply(): Promise<void> {
    if (!preview) return
    setPending(true); setMessage(null)
    try {
      const result = await window.api.applyCsvImport({ token: preview.token, mode })
      if (!result.ok) { setMessage(result.error); return }
      const report = result.data
      setMessage(`${report.imported} added, ${report.merged} merged, ${report.skipped} skipped.${report.errors.length ? ` Errors: ${report.errors.join('; ')}` : ''}`)
      setPreview(null); invalidateWatchLog(); onImported?.()
    } catch (error) { setMessage(error instanceof Error ? error.message : String(error)) }
    finally { setPending(false) }
  }
  return <div className="wt-panel wt-stack" style={{ padding: 24, gap: 14 }}>
    <h2 className="wt-h3">Import library CSV</h2>
    <span className="wt-sub">Bring in titles using their TMDB or AniList IDs. Preview every row before adding it to your library. A safety backup is created first.</span>
    <span className="wt-sub">Required columns: title, source, media_type, external_id. Optional: status, rating, notes, favorite, watched_at (films only; ISO date/time). Up to 5,000 rows / 5 MB.</span>
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      <button className="wt-btn wt-btn-yellow" disabled={pending} onClick={() => void choose()}>{pending ? 'Working…' : 'Choose CSV & preview'}</button>
      <button className="wt-ghost" disabled={pending} onClick={async () => {
        try { const result = await window.api.saveCsvTemplate(); setMessage(result.ok ? result.data ? `Template saved: ${result.data}` : null : result.error) }
        catch (error) { setMessage(error instanceof Error ? error.message : String(error)) }
      }}>Save example template</button>
    </div>
    {preview && <div className="wt-stack" style={{ gap: 12 }}>
      <strong>{preview.fileName} · {preview.rows.length} rows · {preview.rows.filter((row) => row.duplicate).length} duplicates · {preview.rows.filter((row) => row.error).length} invalid</strong>
      <label className="wt-stack" style={{ gap: 6 }}>Duplicates<select className="wt-select" value={mode} onChange={(event) => setMode(event.target.value as ImportDuplicateMode)} disabled={pending}>
        <option value="skip">Skip existing titles</option><option value="merge">Merge supplied personal fields into existing titles</option>
      </select></label>
      <span className="wt-sub">Merge replaces fields whose columns are present, including blank ratings or notes. Existing episode progress and history stay intact. Invalid rows are skipped.</span>
      <div style={{ overflow: 'auto', maxHeight: 320 }}><table style={{ width: '100%', textAlign: 'left', fontSize: 12, borderCollapse: 'collapse' }}>
        <thead><tr>{['Row', 'Title', 'Type / ID', 'Status', 'Rating', 'Notes', 'Favorite', 'Watch date', 'Result'].map((label) => <th key={label} style={{ padding: 8 }}>{label}</th>)}</tr></thead>
        <tbody>{preview.rows.map((row) => {
          const display = (column: string, value: string): string => row.duplicate && mode === 'merge' && preview.columns && !preview.columns.includes(column) ? 'Keep existing' : value
          return <tr key={row.line}>
            <td style={{ padding: 8 }}>{row.line}</td><td style={{ padding: 8 }}>{row.title}</td><td style={{ padding: 8 }}>{row.mediaType} / {row.externalId}</td>
            <td style={{ padding: 8 }}>{display('status', row.watchStatus.replaceAll('_', ' '))}</td>
            <td style={{ padding: 8 }}>{display('rating', row.rating === null ? 'Unrated' : String(row.rating))}</td>
            <td style={{ padding: 8 }}><span title={row.notes ?? ''} style={{ display: 'inline-block', maxWidth: 180, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{display('notes', row.notes ?? 'None')}</span></td>
            <td style={{ padding: 8 }}>{display('favorite', row.favorite ? 'Yes' : 'No')}</td>
            <td style={{ padding: 8 }}>{row.watchedAt ? new Date(row.watchedAt).toLocaleString() : 'No event'}</td>
            <td style={{ padding: 8 }}>{row.error ?? (row.duplicate ? mode === 'merge' ? 'Merge' : 'Skip duplicate' : 'Add')}</td>
          </tr>
        })}</tbody>
      </table></div>
      <div style={{ display: 'flex', gap: 10 }}><button className="wt-btn wt-btn-pink" disabled={pending || !preview.rows.some((row) => !row.error)} onClick={() => void apply()}>Import valid rows</button><button className="wt-ghost" disabled={pending} onClick={() => setPreview(null)}>Cancel</button></div>
    </div>}
    {message && <span role="status" style={{ fontSize: 13, overflowWrap: 'anywhere' }}>{message}</span>}
  </div>
}
