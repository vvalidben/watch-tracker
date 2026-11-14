import { useState } from 'react'
import type { NormalizedMedia } from '@shared/metadata'

export function MetadataControls({ media, onRefreshed }: { media: NormalizedMedia; onRefreshed: (media: NormalizedMedia) => void }): JSX.Element {
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  async function refresh(): Promise<void> {
    setPending(true); setMessage(null)
    try {
      const response = await window.api.refreshMetadata({ source: media.source, mediaType: media.mediaType, externalId: media.externalId })
      if (!response.ok) { setMessage(response.error); return }
      onRefreshed(response.data.media)
      setMessage(response.data.warnings.length ? `Title refreshed. Some episode details could not be saved: ${response.data.warnings.join('; ')}`
        : `Metadata refreshed${media.mediaType === 'movie' ? '.' : `; ${response.data.episodesCached} episodes saved for offline use.`}`)
    } catch (error) { setMessage(error instanceof Error ? error.message : String(error)) }
    finally { setPending(false) }
  }
  return (
    <div className="wt-panel wt-stack" style={{ padding: 18, gap: 8 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <button type="button" className="wt-btn wt-btn-cream" disabled={pending} onClick={() => void refresh()}>
          {pending ? 'Saving metadata…' : 'Refresh & save offline'}
        </button>
        <span className="wt-sub">Update title information and save season and episode details on this computer.</span>
      </div>
      <span className="wt-sub">Your ratings, notes, tags, and watch history are preserved. Requires a connection.</span>
      {message && <span role="status" style={{ fontSize: 13 }}>{message}</span>}
    </div>
  )
}
