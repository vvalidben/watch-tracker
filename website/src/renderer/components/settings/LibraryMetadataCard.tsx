import { useEffect, useRef, useState } from 'react'

export function LibraryMetadataCard(): JSX.Element {
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const cancel = useRef(false)
  useEffect(() => () => { cancel.current = true }, [])
  async function refresh(): Promise<void> {
    cancel.current = false; setPending(true)
    const errors: string[] = []
    let refreshed = 0
    try {
      const library = await window.api.listLibrary({})
      const items = library.items.filter((item) => item.mediaItem.source !== 'manual' && item.mediaItem.sourceId)
      for (const { mediaItem: item } of items) {
        if (cancel.current) break
        if (item.source === 'manual' || !item.sourceId) continue
        setMessage(`Saving ${refreshed + 1} of ${items.length}: ${item.title}…`)
        const result = await window.api.refreshMetadata({ source: item.source, mediaType: item.type, externalId: item.sourceId })
        if (!result.ok) errors.push(`${item.title}: ${result.error}`)
        else errors.push(...result.data.warnings.map((warning) => `${item.title}: ${warning}`))
        refreshed++
      }
      setMessage(`${refreshed} titles checked.${cancel.current ? ' Stopped.' : ''}${errors.length ? ` ${errors.join('; ')}` : ' Saved title and episode details can be used offline.'}`)
    } catch (error) { setMessage(error instanceof Error ? error.message : String(error)) }
    finally { setPending(false) }
  }
  return <div className="wt-panel wt-stack" style={{ padding: 24, gap: 12 }}>
    <h2 className="wt-h3">Library metadata &amp; offline access</h2>
    <span className="wt-sub">Refresh titles, artwork links, episode counts, and air dates. Save every season and episode for offline browsing and tracking. Personal data is kept. Larger libraries may take a few minutes.</span>
    <div style={{ display: 'flex', gap: 10 }}><button className="wt-btn wt-btn-yellow" disabled={pending} onClick={() => void refresh()}>{pending ? 'Saving library…' : 'Refresh & save entire library'}</button>{pending && <button className="wt-ghost" onClick={() => { cancel.current = true }}>Stop after this title</button>}</div>
    {message && <span role="status" style={{ fontSize: 13 }}>{message}</span>}
  </div>
}
