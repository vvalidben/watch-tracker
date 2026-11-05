import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TriangleAlert } from 'lucide-react'
import { Skeleton } from '@renderer/components/ui/skeleton'
import { useWatchLog } from '@renderer/hooks/useWatchLog'
import { mediaPath } from '@renderer/lib/mediaFormatting'
import { cn } from '@renderer/lib/utils'
import { buildCalendarMonth, countMonthEntries, todayKey, watchLogLabel } from '@shared/watchLog'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const TITLES_PER_DAY = 2

/** A month of everything recorded as watched, with the picked day spelled out alongside. */
export function WatchLog(): JSX.Element {
  const navigate = useNavigate()
  const { entries, loading, error } = useWatchLog()
  const today = todayKey()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selectedDay, setSelectedDay] = useState(today)

  const days = useMemo(() => buildCalendarMonth(year, month, entries), [year, month, entries])
  const counts = useMemo(() => countMonthEntries(entries, year, month), [entries, year, month])
  const selected = days.find((day) => day.dayKey === selectedDay)

  function shiftMonth(delta: number): void {
    const target = new Date(year, month + delta, 1)
    setYear(target.getFullYear())
    setMonth(target.getMonth())
  }

  function goToToday(): void {
    setYear(now.getFullYear())
    setMonth(now.getMonth())
    setSelectedDay(today)
  }

  const [selectedYear, selectedMonth, selectedDate] = selectedDay.split('-').map(Number)

  return (
    <section className="wt-stack" style={{ gap: 24 }}>
      <div className="wt-rise" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 18, flexWrap: 'wrap' }}>
        <div className="wt-page-head">
          <span className="wt-page-num" aria-hidden="true">
            04
          </span>
          <div className="wt-stack" style={{ gap: 6 }}>
            <span className="wt-page-jp wt-jp">記録</span>
            <h1 className="wt-h1" style={{ fontSize: 'clamp(30px,3.6vw,44px)' }}>
              {MONTHS[month]} {year}
            </h1>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="wt-ghost" onClick={() => shiftMonth(-1)}>
            ← {MONTHS[(month + 11) % 12].slice(0, 3)}
          </button>
          <button type="button" className="wt-btn wt-btn-yellow" onClick={goToToday}>
            Today
          </button>
          <button type="button" className="wt-ghost" onClick={() => shiftMonth(1)}>
            {MONTHS[(month + 1) % 12].slice(0, 3)} →
          </button>
        </div>
      </div>

      {error && (
        <div className="wt-error">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <Skeleton className="h-[520px] rounded-[22px]" />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,280px),1fr))', gap: 28, alignItems: 'start' }}>
          <div style={{ gridColumn: 'span 2', minWidth: 0, display: 'grid', gridTemplateColumns: 'repeat(7,minmax(0,1fr))', gap: 6 }}>
            {WEEKDAYS.map((weekday) => (
              <div key={weekday} className="wt-display" style={{ padding: '4px 6px', fontSize: 11, color: 'var(--wt-muted)' }}>
                {weekday}
              </div>
            ))}
            {days.map((day, index) => {
              const extra = day.titles.length - TITLES_PER_DAY
              return (
                <div key={day.dayKey} className="wt-pop" style={{ animationDelay: `${Math.min(index, 24) * 40}ms`, minWidth: 0 }}>
                  <button
                    type="button"
                    aria-pressed={day.dayKey === selectedDay}
                    className={cn('wt-cal-day', !day.inMonth && 'is-out', day.dayKey === selectedDay && 'is-selected')}
                    onClick={() => setSelectedDay(day.dayKey)}
                  >
                    <span className="wt-display" style={{ fontSize: 15, lineHeight: 1, color: day.dayKey === today ? 'var(--wt-accent-700)' : 'inherit' }}>
                      {day.dayOfMonth}
                    </span>
                    {day.titles.slice(0, TITLES_PER_DAY).map((title) => (
                      <span key={title.mediaItemId} className="wt-cal-entry" style={{ maxWidth: '100%' }}>
                        {title.title.split(':')[0]}
                        {title.count > 1 ? ` ×${title.count}` : ''}
                      </span>
                    ))}
                    {extra > 0 && <span style={{ fontSize: 10, color: 'var(--wt-a2)', fontWeight: 700 }}>+{extra} more</span>}
                  </button>
                </div>
              )
            })}
          </div>

          <aside className="wt-panel wt-stack wt-rise" style={{ gap: 16, padding: 22, position: 'sticky', top: 24, animationDelay: '200ms' }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--wt-a1)' }}>Selected day</span>
            <span className="wt-display" style={{ fontSize: 26, lineHeight: 1 }}>
              {selectedDate} {MONTHS[selectedMonth - 1]}
              {selectedYear !== now.getFullYear() ? ` ${selectedYear}` : ''}
            </span>
            <div className="wt-stack" style={{ gap: 6 }}>
              {selected?.entries.map((entry) => {
                const path = mediaPath({ source: entry.source, type: entry.mediaType, sourceId: entry.sourceId })
                return (
                  <button
                    key={`${entry.watchedAt}-${entry.mediaItemId}-${entry.seasonNumber}-${entry.episodeNumber}`}
                    type="button"
                    disabled={!path}
                    style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 12px', borderRadius: 12, background: 'var(--wt-sunken)', textAlign: 'left', cursor: path ? 'pointer' : 'default' }}
                    onClick={() => path && navigate(path)}
                  >
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{entry.title}</span>
                    <span className="wt-display" style={{ fontSize: 12, color: 'var(--wt-a3)', whiteSpace: 'nowrap' }}>
                      {watchLogLabel(entry)}
                    </span>
                  </button>
                )
              })}
              {!selected?.entries.length && <span style={{ fontSize: 14, color: 'var(--wt-muted)', padding: '8px 0' }}>Nothing watched this day.</span>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="wt-stack" style={{ padding: 14, borderRadius: 14, background: 'var(--wt-sunken)', gap: 4 }}>
                <span className="wt-display" style={{ fontSize: 28, lineHeight: 1, color: 'var(--wt-a1)' }}>
                  {counts.episodes}
                </span>
                <span style={{ fontSize: 12, color: 'var(--wt-muted)' }}>Episodes this month</span>
              </div>
              <div className="wt-stack" style={{ padding: 14, borderRadius: 14, background: 'var(--wt-sunken)', gap: 4 }}>
                <span className="wt-display" style={{ fontSize: 28, lineHeight: 1, color: 'var(--wt-a2)' }}>
                  {counts.films}
                </span>
                <span style={{ fontSize: 12, color: 'var(--wt-muted)' }}>Films this month</span>
              </div>
            </div>
          </aside>
        </div>
      )}
    </section>
  )
}
