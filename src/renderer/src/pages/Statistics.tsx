import { useNavigate } from 'react-router-dom'
import { BarChart3, TriangleAlert } from 'lucide-react'
import { PageTitle } from '@renderer/components/neon/PageTitle'
import { EmptyState } from '@renderer/components/layout/EmptyState'
import { Skeleton } from '@renderer/components/ui/skeleton'
import { useStatistics } from '@renderer/hooks/useStatistics'
import { mediaPath, watchStatusLabel } from '@renderer/lib/mediaFormatting'

const ACCENTS = ['#ff4f9a', '#38e1ff', '#ffd84a']
const ACCENT_TEXT = ['var(--wt-a1)', 'var(--wt-a2)', 'var(--wt-a3)']
const STATUS_ORDER = ['watching', 'completed', 'plan_to_watch', 'on_hold', 'dropped'] as const
const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function monthLabel(month: string): string {
  return SHORT_MONTHS[Number(month.split('-')[1]) - 1] ?? month
}

function BarList({ title, color, rows, delayMs }: { title: string; color: string; rows: { label: string; count: number }[]; delayMs: number }): JSX.Element {
  const max = Math.max(1, ...rows.map((row) => row.count))
  return (
    <div className="wt-panel wt-stack wt-rise" style={{ padding: 24, gap: 14, animationDelay: `${delayMs}ms` }}>
      <h2 className="wt-h3">{title}</h2>
      {rows.length === 0 && <span className="wt-sub">Nothing here yet.</span>}
      {rows.map((row, index) => (
        <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '100px minmax(0,1fr) 24px', gap: 10, alignItems: 'center' }}>
          <span className="wt-truncate" title={row.label} style={{ fontSize: 13, fontWeight: 500 }}>
            {row.label}
          </span>
          <div className="wt-bar" style={{ height: 10 }}>
            <div className="wt-bar-fill" style={{ width: `${Math.round((row.count / max) * 100)}%`, borderRadius: 99, background: color, animationDelay: `${index * 40}ms` }} />
          </div>
          <span className="wt-display" style={{ fontSize: 13, textAlign: 'right' }}>
            {row.count}
          </span>
        </div>
      ))}
    </div>
  )
}

export function Statistics(): JSX.Element {
  const navigate = useNavigate()
  const { statistics, loading, error } = useStatistics()

  return (
    <section className="wt-stack" style={{ gap: 30 }}>
      <PageTitle number="05" jp="統計" title="Statistics" />

      {loading ? (
        <div className="wt-stack" style={{ gap: 20 }}>
          <Skeleton className="h-28 rounded-[20px]" />
          <Skeleton className="h-72 rounded-[24px]" />
        </div>
      ) : error || !statistics ? (
        <div className="wt-error">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error ?? 'Could not load statistics.'}</span>
        </div>
      ) : statistics.completion.totalInLibrary === 0 ? (
        <EmptyState icon={BarChart3} title="Nothing to show yet" description="Add and rate a few titles in your library, then check back here." />
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 14 }}>
            {[
              { value: statistics.completion.completionRate !== null ? `${statistics.completion.completionRate}%` : '—', label: 'Completion rate' },
              { value: statistics.overview.totalEpisodesWatched, label: 'Episodes watched' },
              { value: statistics.overview.moviesWatched, label: 'Films watched' },
              { value: Math.round(statistics.overview.estimatedWatchTimeMinutes / 60), label: 'Hours watched' }
            ].map((figure, index) => (
              <div key={figure.label} className="wt-pop" style={{ animationDelay: `${index * 40}ms` }}>
                <div className="wt-stack" style={{ padding: 20, borderRadius: 20, background: 'var(--wt-surface)', border: '2px solid var(--wt-ink)', boxShadow: `5px 5px 0 ${ACCENTS[index % 3]}`, gap: 6 }}>
                  <span className="wt-display" style={{ fontSize: 46, lineHeight: 1, color: ACCENT_TEXT[index % 3] }}>
                    {figure.value}
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--wt-muted)', fontWeight: 500 }}>{figure.label}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="wt-panel wt-stack wt-rise" style={{ padding: 26, borderRadius: 24, gap: 14, animationDelay: '150ms' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
              <h2 className="wt-h2" style={{ fontSize: 22, flex: 1, minWidth: 0 }}>
                Episodes per month
              </h2>
              <span style={{ fontSize: 12, color: 'var(--wt-muted)' }}>Last 12 months</span>
            </div>
            {(() => {
              const months = statistics.episodesByMonth
              const max = Math.max(1, ...months.map((month) => month.count))
              return (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${months.length},minmax(0,1fr))`, gap: 10, alignItems: 'end', height: 220 }}>
                    {months.map((month, index) => (
                      <div key={month.month} className="wt-stack" style={{ justifyContent: 'flex-end', gap: 6, height: '100%' }}>
                        <span className="wt-display" style={{ fontSize: 11, textAlign: 'center', color: 'var(--wt-a3)' }}>
                          {month.count}
                        </span>
                        <div className="wt-month-bar" style={{ height: `${Math.max(1, Math.round((month.count / max) * 100))}%`, animationDelay: `${index * 40}ms` }} />
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${months.length},minmax(0,1fr))`, gap: 10 }}>
                    {months.map((month) => (
                      <span key={month.month} style={{ fontSize: 11, fontWeight: 700, textAlign: 'center', color: 'var(--wt-muted)' }}>
                        {monthLabel(month.month)}
                      </span>
                    ))}
                  </div>
                </>
              )
            })()}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,300px),1fr))', gap: 20 }}>
            <BarList
              title="By status"
              color="#38e1ff"
              delayMs={200}
              rows={STATUS_ORDER.map((status) => ({
                label: watchStatusLabel(status),
                count: statistics.completion.byStatus.find((entry) => entry.status === status)?.count ?? 0
              }))}
            />
            <BarList
              title="Favorite genres"
              color="#ff4f9a"
              delayMs={260}
              rows={statistics.favoriteGenres.slice(0, 6).map((entry) => ({ label: entry.genre, count: entry.count }))}
            />
            <div className="wt-panel wt-stack wt-rise" style={{ padding: 24, gap: 8, animationDelay: '320ms' }}>
              <h2 className="wt-h3" style={{ marginBottom: 6 }}>
                Highest rated
              </h2>
              {statistics.highestRated.length === 0 && <span className="wt-sub">Rate something to see it here.</span>}
              {statistics.highestRated.map((item, index) => {
                const path = mediaPath(item)
                return (
                  <button
                    key={item.mediaItemId}
                    type="button"
                    disabled={!path}
                    className="wt-row"
                    style={{ display: 'grid', gridTemplateColumns: '30px 1fr auto', gap: 10, alignItems: 'center', padding: '8px 10px', background: 'var(--wt-sunken)', textAlign: 'left', cursor: path ? 'pointer' : 'default' }}
                    onClick={() => path && navigate(path)}
                  >
                    <span className="wt-display" style={{ fontSize: 16, color: 'var(--wt-a1)' }}>
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="wt-truncate" style={{ fontWeight: 700, fontSize: 14 }}>
                      {item.title}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--wt-a3)' }}>★ {item.rating.toFixed(1)}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </section>
  )
}
