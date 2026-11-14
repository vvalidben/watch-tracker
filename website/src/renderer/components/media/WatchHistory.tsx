import { useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, History } from 'lucide-react'

interface WatchHistoryProps {
  /** Total times watched (rewatches included). Renders nothing when 0 — never watched, nothing to inspect. */
  watchCount: number
  /** Fetched lazily on first expand, not up front, since most items are only ever watched once. */
  onLoadHistory: () => Promise<string[]>
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString()
}

/** A small expandable "Watched Nx" disclosure listing every date something was marked watched. */
export function WatchHistory({ watchCount, onLoadHistory }: WatchHistoryProps): JSX.Element | null {
  const [open, setOpen] = useState(false)
  const [dates, setDates] = useState<string[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { setDates(null); setOpen(false) }, [watchCount])

  if (watchCount === 0) return null

  async function toggle(): Promise<void> {
    if (!open && dates === null) {
      setLoading(true)
      setError(null)
      try { setDates(await onLoadHistory()) }
      catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)) }
      finally { setLoading(false) }
    }
    setOpen((prev) => !prev)
  }

  return (
    <div className="text-xs text-muted-foreground">
      <button
        type="button"
        onClick={() => void toggle()}
        className="flex items-center gap-1 rounded-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <History className="h-3 w-3" />
        {watchCount > 1 ? `Watched ${watchCount}×` : 'Watched'}
      </button>
      {open && (
        <ul className="mt-1 space-y-0.5 rounded-md bg-muted/30 py-1 pl-4 pr-2">
          {loading && <li>Loading…</li>}
          {error && <li>{error}</li>}
          {dates?.map((date, index) => <li key={`${date}:${index}`}>{formatDate(date)}</li>)}
        </ul>
      )}
    </div>
  )
}
