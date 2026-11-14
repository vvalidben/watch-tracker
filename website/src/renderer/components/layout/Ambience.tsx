import { useLocation } from 'react-router-dom'
import { useWatchLog } from '@renderer/hooks/useWatchLog'
import { formatShortDate } from '@renderer/lib/mediaFormatting'
import { watchLogLabel } from '@shared/watchLog'
import { useVisualStyle } from '@renderer/lib/visualStyle'

const PETALS = Array.from({ length: 22 }, (_, i) => ({
  left: `${(i * 47) % 100}%`,
  width: 9 + (i % 4) * 3,
  height: 7 + (i % 3) * 3,
  background: i % 5 === 0 ? '#ffd84a' : '#ff8fc0',
  animationDuration: `${10 + (i % 6) * 2}s`,
  animationDelay: `${-(i * 1.7)}s`
}))

export function Petals(): JSX.Element {
  const style = useVisualStyle()
  const backdrop = <div className={`wt-living-backdrop wt-living-${style}`} aria-hidden="true"><span /><span /><span /><span /></div>
  if (style !== 'neon') return <>{backdrop}<div className={`wt-atmosphere wt-atmosphere-${style}`} aria-hidden="true"><i /><i /><i /><i /><i /><i /></div></>
  return (
    <>{backdrop}<div className="wt-petals" aria-hidden="true">
      {PETALS.map((style, index) => (
        <span key={index} className="wt-petal" style={style} />
      ))}
    </div></>
  )
}

/** A short accent trace marks page changes without covering the collection. */
export function RouteWipe(): JSX.Element {
  const { pathname } = useLocation()
  const style = useVisualStyle()
  return <div key={`${style}-${pathname}`} className={`wt-wipe wt-wipe-${style}`} aria-hidden="true" />
}

const TICKER_ITEMS = 8
/** A short history is repeated so one half of the loop still fills a wide window. */
const MIN_LOOP_ITEMS = 12

/** The scrolling band of recent watches. Absent until there's something to show. */
export function Ticker(): JSX.Element | null {
  const { entries } = useWatchLog()
  const recent = entries.slice(0, TICKER_ITEMS)
  if (recent.length === 0) return null

  const texts = recent.map(
    (entry) => `${entry.title.split(':')[0]} · ${watchLogLabel(entry)} · ${formatShortDate(entry.watchedAt)}`
  )
  const half: string[] = []
  while (half.length < MIN_LOOP_ITEMS) half.push(...texts)

  return (
    <div className="wt-ticker" aria-hidden="true">
      <div className="wt-ticker-track">
        {[...half, ...half].map((text, index) => (
          <span key={index} className="wt-ticker-item">
            <span style={{ color: 'var(--wt-pink)' }}>★</span>
            {text}
          </span>
        ))}
      </div>
    </div>
  )
}
