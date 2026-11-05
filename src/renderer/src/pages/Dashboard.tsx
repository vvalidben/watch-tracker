import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Compass, TriangleAlert } from 'lucide-react'
import { Skeleton } from '@renderer/components/ui/skeleton'
import { EmptyState } from '@renderer/components/layout/EmptyState'
import { Poster } from '@renderer/components/neon/Poster'
import { useDashboard } from '@renderer/hooks/useDashboard'
import { useStatistics } from '@renderer/hooks/useStatistics'
import { useNextEpisodes } from '@renderer/hooks/useNextEpisodes'
import { invalidateWatchLog, useWatchLog } from '@renderer/hooks/useWatchLog'
import { extractYear, formatShortDate, mediaPath, mediaTypeLabel, metaLine } from '@renderer/lib/mediaFormatting'
import { posterHues, japaneseTitle } from '@renderer/lib/posterArt'
import { mediaItemToOfflineNormalizedMedia } from '@shared/offlineMedia'
import { watchLogLabel } from '@shared/watchLog'
import type { LibraryItemDTO, SeriesProgressDTO } from '@shared/library'

const ACCENTS = ['var(--wt-a1)', 'var(--wt-a2)', 'var(--wt-a3)']
const CONTINUE_LIMIT = 3
const WATCHLIST_SHELF_LIMIT = 4
const RECENT_LOG_LIMIT = 7

interface NextUp {
  /** "Season 2, Episode 5", or cached counts when the provider can't be reached. */
  text: string
  /** The label on the mark button ("E5", "S2 E5", "film"), or null when there's nothing to mark. */
  short: string | null
  percent: number
  progress: string
}

function describeNextUp(item: LibraryItemDTO, series: SeriesProgressDTO | undefined): NextUp {
  const cached = item.progress
  const percent = series?.percentage ?? cached?.percentage ?? 0
  const watched = series?.watchedEpisodes ?? cached?.watchedEpisodes
  const total = series?.totalEpisodes ?? cached?.totalEpisodes
  const progress = watched !== undefined && total !== undefined ? `${watched} / ${total} · ${percent}%` : ''

  if (item.mediaItem.type === 'movie') return { text: 'Film', short: 'film', percent, progress }
  if (!series) return { text: progress || 'Keep going', short: null, percent, progress }
  if (series.isFullyWatched || series.currentSeasonNumber === null || series.currentEpisodeNumber === null) {
    return { text: 'Finished', short: null, percent, progress }
  }

  const multiSeason = (item.mediaItem.numberOfSeasons ?? 1) > 1 || series.currentSeasonNumber !== 1
  return {
    text: `Season ${series.currentSeasonNumber}, Episode ${series.currentEpisodeNumber}`,
    short: `${multiSeason ? `S${series.currentSeasonNumber} ` : ''}E${series.currentEpisodeNumber}`,
    percent,
    progress
  }
}

function posterProps(item: LibraryItemDTO) {
  const { mediaItem, libraryEntry } = item
  return {
    title: mediaItem.title,
    originalTitle: mediaItem.originalTitle,
    mediaType: mediaItem.type,
    year: extractYear(mediaItem.releaseDate),
    image: mediaItem.posterPath,
    favorite: libraryEntry.favorite
  }
}

export function Dashboard(): JSX.Element {
  const navigate = useNavigate()
  const { data, loading, error, refresh } = useDashboard()
  const { statistics, refresh: refreshStatistics } = useStatistics()
  const { entries } = useWatchLog()
  const continueItems = data?.shelves.continueWatching.slice(0, CONTINUE_LIMIT) ?? []
  const next = useNextEpisodes(continueItems)
  const [markingId, setMarkingId] = useState<number | null>(null)
  const [markError, setMarkError] = useState<string | null>(null)

  if (loading) {
    return (
      <div className="wt-stack" style={{ gap: 40 }}>
        <Skeleton className="h-80 rounded-[26px]" />
        <div className="grid grid-cols-3 gap-3.5">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-24 rounded-[18px]" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="wt-error">
        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{error ?? 'Could not load the dashboard.'}</span>
      </div>
    )
  }

  const { stats, shelves } = data

  if (Object.values(shelves).every((shelf) => shelf.length === 0)) {
    return (
      <EmptyState
        icon={Compass}
        title="Your dashboard is empty"
        description="Search for a film, series, or anime to add your first title. Everything you track will show up here."
        action={
          <button type="button" className="wt-btn wt-btn-lg wt-btn-pink" onClick={() => navigate('/search')}>
            ＋ Add a title
          </button>
        }
      />
    )
  }

  const statusCount = (status: string): number =>
    statistics?.completion.byStatus.find((entry) => entry.status === status)?.count ?? 0
  const completed = stats.moviesWatched + stats.seriesCompleted + stats.animeCompleted
  const planCount = statusCount('plan_to_watch')

  const tiles = [
    { value: statistics?.completion.totalInLibrary ?? '—', label: 'In library' },
    { value: statistics ? statusCount('watching') : '—', label: 'Watching' },
    { value: completed, label: 'Completed' },
    { value: stats.totalEpisodesWatched, label: 'Episodes watched' },
    { value: Math.round(stats.estimatedWatchTimeMinutes / 60), label: 'Hours watched' },
    { value: stats.averagePersonalRating !== null ? stats.averagePersonalRating.toFixed(1) : '—', label: 'Average rating' }
  ]

  function open(item: LibraryItemDTO): void {
    const path = mediaPath(item.mediaItem)
    if (path) navigate(path)
  }

  async function markNext(item: LibraryItemDTO): Promise<void> {
    const media = mediaItemToOfflineNormalizedMedia(item.mediaItem)
    if (!media) return
    const series = next.progressById.get(item.mediaItem.id)

    setMarkingId(item.mediaItem.id)
    setMarkError(null)
    const result =
      media.mediaType === 'movie'
        ? await window.api.setWatchStatus({ media, watchStatus: 'completed' })
        : await window.api.setEpisodeWatched({
            media,
            seasonNumber: series?.currentSeasonNumber as number,
            episodeNumber: series?.currentEpisodeNumber as number,
            watched: true
          })
    if (result.ok) {
      await Promise.all([refresh(), refreshStatistics()])
      invalidateWatchLog()
    } else {
      setMarkError(result.error)
    }
    setMarkingId(null)
  }

  // Disabled while the next episode is being re-read too: until then the old
  // one would be marked again, and every mark is recorded as a rewatch.
  const markDisabled = markingId !== null || next.loading
  const [hero, ...rest] = continueItems
  const heroNext = hero ? describeNextUp(hero, next.progressById.get(hero.mediaItem.id)) : null
  const heroJp = hero ? japaneseTitle(hero.mediaItem.originalTitle) : null

  return (
    <section className="wt-stack" style={{ gap: 40 }}>
      {markError && (
        <div className="wt-error">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{markError}</span>
        </div>
      )}

      {hero && heroNext && (
        <div
          className="wt-hero dark"
          style={{
            background: `linear-gradient(115deg, oklch(0.4 0.2 ${posterHues(hero.mediaItem.title).hue}) 0%, #1b1533 62%)`,
            display: 'grid',
            gridTemplateColumns: 'minmax(0,1fr) auto',
            gap: 32,
            alignItems: 'center',
            padding: '40px 44px'
          }}
        >
          <div className="wt-sunburst" style={{ left: '60%', top: '50%', width: 1400, height: 1400, margin: '-700px 0 0 -700px' }} />
          <div className="wt-stack" style={{ position: 'relative', gap: 14, minWidth: 0 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="wt-display" style={{ padding: '5px 12px', borderRadius: 99, background: 'var(--wt-cyan)', color: 'var(--wt-ink)', fontSize: 12, border: '2px solid var(--wt-ink)' }}>
                ▶ UP NEXT
              </span>
              <span className="wt-display wt-jp" style={{ fontSize: 12, letterSpacing: '0.3em', color: 'var(--wt-yellow)' }}>
                次のエピソード
              </span>
            </div>
            <button type="button" className="wt-hero-title" style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', color: 'inherit' }} onClick={() => open(hero)}>
              {hero.mediaItem.title}
            </button>
            {heroJp && (
              <div className="wt-display wt-jp" style={{ fontSize: 18, color: 'var(--wt-yellow)', letterSpacing: '0.12em' }}>
                {heroJp}
              </div>
            )}
            <div style={{ fontSize: 16, fontWeight: 500 }}>{heroNext.text}</div>
            <div className="wt-stack" style={{ maxWidth: 460, gap: 6 }}>
              <div className="wt-bar wt-bar-ink" style={{ height: 12 }}>
                <div className="wt-bar-fill wt-stripes-pink" style={{ width: `${heroNext.percent}%` }} />
              </div>
              <span style={{ fontSize: 13, color: 'var(--wt-soft)' }}>{heroNext.progress}</span>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 6 }}>
              {heroNext.short && (
                <button type="button" className="wt-btn wt-btn-lg wt-btn-pink" disabled={markDisabled} onClick={() => void markNext(hero)}>
                  ✓ Mark {heroNext.short} watched
                </button>
              )}
              <button type="button" className="wt-ghost" style={{ padding: '12px 20px', borderRadius: 14, fontSize: 15, background: 'rgba(7,5,13,0.35)' }} onClick={() => open(hero)}>
                Open details
              </button>
            </div>
          </div>
          <div style={{ position: 'relative', width: 210, animation: 'wt-floaty 5s ease-in-out infinite' }}>
            <Poster {...posterProps(hero)} />
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 14 }}>
        {tiles.map((tile, index) => (
          <div key={tile.label} className="wt-rise" style={{ animationDelay: `${index * 40}ms` }}>
            <div className="wt-tile">
              <span className="wt-display wt-tabular" style={{ fontSize: 38, lineHeight: 1, color: ACCENTS[index % 3] }}>
                {tile.value}
              </span>
              <span style={{ fontSize: 13, color: 'var(--wt-muted)', fontWeight: 500 }}>{tile.label}</span>
            </div>
          </div>
        ))}
      </div>

      {rest.length > 0 && (
        <div className="wt-stack" style={{ gap: 16 }}>
          <div className="wt-section-head">
            <h2 className="wt-h2">
              Continue watching{' '}
              <span className="wt-jp" style={{ fontFamily: 'inherit', fontWeight: 700, fontSize: 13, color: 'var(--wt-a1)', letterSpacing: '0.2em' }}>
                続きを見る
              </span>
            </h2>
            <button type="button" className="wt-link" onClick={() => navigate('/library')}>
              View library →
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(330px,1fr))', gap: 18 }}>
            {rest.map((item, index) => {
              const nextUp = describeNextUp(item, next.progressById.get(item.mediaItem.id))
              return (
                <div key={item.mediaItem.id} className="wt-rise" style={{ animationDelay: `${index * 40}ms` }}>
                  <div className="wt-card" style={{ display: 'flex', gap: 18, height: '100%', boxSizing: 'border-box' }}>
                    <button type="button" aria-label={`Open ${item.mediaItem.title}`} style={{ width: 96, flex: 'none', cursor: 'pointer' }} onClick={() => open(item)}>
                      <Poster {...posterProps(item)} />
                    </button>
                    <div className="wt-stack" style={{ gap: 7, minWidth: 0, flex: 1 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--wt-a2)' }}>
                        {metaLine(mediaTypeLabel(item.mediaItem.type), extractYear(item.mediaItem.releaseDate))}
                      </span>
                      <button type="button" className="wt-display" style={{ fontSize: 18, lineHeight: 1.15, textAlign: 'left', cursor: 'pointer' }} onClick={() => open(item)}>
                        {item.mediaItem.title}
                      </button>
                      <span style={{ fontSize: 13, color: 'var(--wt-muted)' }}>Next · {nextUp.text}</span>
                      <div style={{ flex: 1 }} />
                      <div className="wt-bar" style={{ height: 9 }}>
                        <div className="wt-bar-fill wt-stripes-cyan" style={{ width: `${nextUp.percent}%` }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                        <span className="wt-tabular" style={{ fontSize: 12, color: 'var(--wt-muted)' }}>
                          {nextUp.progress}
                        </span>
                        {nextUp.short && (
                          <button type="button" className="wt-btn wt-btn-sm wt-btn-yellow" disabled={markDisabled} onClick={() => void markNext(item)}>
                            ✓ {nextUp.short}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,380px),1fr))', gap: 40 }}>
        {shelves.watchlist.length > 0 && (
          <div className="wt-stack" style={{ gap: 16 }}>
            <div className="wt-section-head">
              <h2 className="wt-h2">Watchlist</h2>
              <button type="button" className="wt-link" onClick={() => navigate('/watchlist')}>
                All {planCount || shelves.watchlist.length} →
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(110px,1fr))', gap: 16 }}>
              {shelves.watchlist.slice(0, WATCHLIST_SHELF_LIMIT).map((item, index) => (
                <div key={item.mediaItem.id} className="wt-pop" style={{ animationDelay: `${index * 40}ms` }}>
                  <button type="button" className="wt-lift wt-stack" aria-label={`Open ${item.mediaItem.title}`} style={{ width: '100%', gap: 8, textAlign: 'left', cursor: 'pointer' }} onClick={() => open(item)}>
                    <Poster {...posterProps(item)} />
                    <span className="wt-truncate" style={{ width: '100%', fontSize: 12, fontWeight: 700 }}>
                      {item.mediaItem.title}
                    </span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {entries.length > 0 && (
          <div className="wt-stack" style={{ gap: 16 }}>
            <div className="wt-section-head">
              <h2 className="wt-h2">Recently watched</h2>
              <button type="button" className="wt-link" onClick={() => navigate('/log')}>
                Watch log →
              </button>
            </div>
            <div className="wt-stack" style={{ gap: 8, position: 'relative', paddingLeft: 20, borderLeft: '2px dashed rgba(255,79,154,0.4)' }}>
              {entries.slice(0, RECENT_LOG_LIMIT).map((entry, index) => {
                const path = mediaPath({ source: entry.source, type: entry.mediaType, sourceId: entry.sourceId })
                return (
                  <div key={`${entry.watchedAt}-${entry.mediaItemId}-${entry.episodeNumber}-${entry.seasonNumber}`} className="wt-rise" style={{ animationDelay: `${index * 40}ms` }}>
                    <button
                      type="button"
                      className="wt-row"
                      disabled={!path}
                      style={{ position: 'relative', width: '100%', display: 'grid', gridTemplateColumns: '62px 1fr auto', gap: 12, alignItems: 'center', padding: '10px 14px', textAlign: 'left', cursor: path ? 'pointer' : 'default' }}
                      onClick={() => path && navigate(path)}
                    >
                      <span style={{ position: 'absolute', left: -28, top: '50%', width: 12, height: 12, marginTop: -6, borderRadius: '50%', background: 'var(--wt-pink)', border: '2px solid var(--wt-bg)' }} />
                      <span className="wt-tabular" style={{ fontSize: 12, color: 'var(--wt-muted)' }}>
                        {formatShortDate(entry.watchedAt)}
                      </span>
                      <span className="wt-truncate" style={{ fontWeight: 700, fontSize: 14 }}>
                        {entry.title}
                      </span>
                      <span className="wt-display" style={{ fontSize: 12, color: 'var(--wt-a3)' }}>
                        {watchLogLabel(entry)}
                      </span>
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
