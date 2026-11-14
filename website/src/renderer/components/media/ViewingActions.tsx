import { useRef, useState } from 'react'
import type { NormalizedMedia } from '@shared/metadata'
import { ConfirmDialog } from '@renderer/components/neon/ConfirmDialog'
import { localDateTimeValue } from '@renderer/lib/localDateTime'

export function ViewingActions({ media, onChange }: { media: NormalizedMedia; onChange: () => void }): JSX.Element {
  const [pending, setPending] = useState(false)
  const busy = useRef(false)
  const [date, setDate] = useState(() => localDateTimeValue())
  const [season, setSeason] = useState(1)
  const [episode, setEpisode] = useState(1)
  const [message, setMessage] = useState<string | null>(null)
  const identity = { source: media.source, mediaType: media.mediaType, externalId: media.externalId }
  async function run(action: () => ReturnType<typeof window.api.startRewatch>, success: string): Promise<void> {
    if (busy.current) return
    busy.current = true
    setPending(true); setMessage(null)
    try {
      const result = await action()
      if (result.ok) { setMessage(success); onChange() } else setMessage(result.error)
    } catch (error) { setMessage(error instanceof Error ? error.message : String(error)) }
    finally { busy.current = false; setPending(false) }
  }
  return (
    <details className="wt-panel" style={{ padding: 20, borderRadius: 20 }}>
      <summary style={{ cursor: 'pointer', fontWeight: 700 }}>Log a watch or start a rewatch</summary>
      <div className="wt-stack" style={{ gap: 14, marginTop: 16 }}>
        <span className="wt-sub">Log a first watch or another viewing, including a date in the past. Each submission adds a watch to your history.</span>
        <form style={{ display: 'flex', gap: 12, alignItems: 'end', flexWrap: 'wrap' }} onSubmit={(event) => {
          event.preventDefault()
          if (!date) return
          void run(() => window.api.logWatch({ ...identity, watchedAt: new Date(date).toISOString(),
            ...(media.mediaType === 'movie' ? {} : { seasonNumber: season, episodeNumber: episode }) }), 'Watch added to history.')
        }}>
          {media.mediaType !== 'movie' && <>
            <label className="wt-stack" style={{ gap: 5 }}>Season<input className="wt-input" style={{ width: 90 }} type="number" min={media.mediaType === 'anime' ? 1 : 0} max={media.mediaType === 'anime' ? 1 : undefined} required value={season} onChange={(event) => setSeason(Number(event.target.value))} /></label>
            <label className="wt-stack" style={{ gap: 5 }}>Episode<input className="wt-input" style={{ width: 90 }} type="number" min={1} required value={episode} onChange={(event) => setEpisode(Number(event.target.value))} /></label>
          </>}
          <label className="wt-stack" style={{ gap: 5 }}>Watched on<input className="wt-input" type="datetime-local" required max={localDateTimeValue()} value={date} onChange={(event) => setDate(event.target.value)} /></label>
          <button className="wt-btn wt-btn-yellow" type="submit" disabled={pending}>{pending ? 'Saving…' : 'Log watch'}</button>
        </form>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <ConfirmDialog trigger={<button type="button" className="wt-ghost" disabled={pending}>Start rewatch</button>}
            title={`Rewatch ${media.title}?`} description="This resets current episode progress and sets the title to Watching. Your ratings, notes, tags, and every previous watch date will be kept."
            confirmLabel="Start rewatch" onConfirm={() => void run(() => window.api.startRewatch(identity), 'Rewatch started. Your history is preserved.')} />
          <span className="wt-sub">Edit recorded dates from the Watch log.</span>
        </div>
        {message && <span role="status" style={{ fontSize: 13 }}>{message}</span>}
      </div>
    </details>
  )
}
