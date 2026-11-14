import { useState } from 'react'
import { localDateTimeValue } from '@renderer/lib/localDateTime'
import { invalidateWatchLog } from '@renderer/hooks/useWatchLog'

export function WatchDateEditor({ eventId, watchedAt }: { eventId: number; watchedAt: string }): JSX.Element {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(() => localDateTimeValue(watchedAt))
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  return <div style={{ padding: '0 12px 8px' }}>
    <button className="wt-quiet" type="button" onClick={() => setOpen(!open)}>{open ? 'Cancel date edit' : 'Edit watch date'}</button>
    {open && <form style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }} onSubmit={async (event) => {
      event.preventDefault(); setPending(true); setError(null)
      try {
        const result = await window.api.editWatchDate({ eventId, watchedAt: new Date(value).toISOString() })
        if (!result.ok) setError(result.error)
        else { setOpen(false); invalidateWatchLog() }
      } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)) }
      finally { setPending(false) }
    }}>
      <input className="wt-input" aria-label="Watch date" type="datetime-local" value={value} max={localDateTimeValue()} required onChange={(event) => setValue(event.target.value)} />
      <button type="submit" className="wt-btn wt-btn-sm wt-btn-yellow" disabled={pending}>Save date</button>
      {error && <span role="alert" className="wt-sub">{error}</span>}
    </form>}
  </div>
}
