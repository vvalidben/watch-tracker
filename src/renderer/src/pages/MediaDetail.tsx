import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { TriangleAlert, WifiOff } from 'lucide-react'
import { Skeleton } from '@renderer/components/ui/skeleton'
import { ConfirmDialog } from '@renderer/components/neon/ConfirmDialog'
import { Poster } from '@renderer/components/neon/Poster'
import { RatingStars } from '@renderer/components/media/RatingStars'
import { WatchStatusSelect } from '@renderer/components/media/WatchStatusSelect'
import { SeriesWatchActions } from '@renderer/components/media/SeriesWatchActions'
import { SeasonSummary } from '@renderer/components/media/SeasonSummary'
import { SeasonWatchActions } from '@renderer/components/media/SeasonWatchActions'
import { SeasonRatingPanel } from '@renderer/components/media/SeasonRatingPanel'
import { EpisodeList } from '@renderer/components/media/EpisodeList'
import { EpisodeTiles } from '@renderer/components/media/EpisodeTiles'
import { WatchHistory } from '@renderer/components/media/WatchHistory'
import { TagEditor } from '@renderer/components/media/TagEditor'
import { useLibraryState } from '@renderer/hooks/useLibraryState'
import { useSeriesProgress } from '@renderer/hooks/useSeriesProgress'
import { useSeriesRatingSummary } from '@renderer/hooks/useSeriesRatingSummary'
import { useSeasons } from '@renderer/hooks/useSeasons'
import { useSeasonRating } from '@renderer/hooks/useSeasonRating'
import { useEpisodes } from '@renderer/hooks/useEpisodes'
import { useTags } from '@renderer/hooks/useTags'
import { useBackNavigation } from '@renderer/hooks/useBackNavigation'
import { invalidateWatchLog } from '@renderer/hooks/useWatchLog'
import { japaneseTitle, posterHues } from '@renderer/lib/posterArt'
import {
  extractYear,
  formatShortDate,
  lengthText,
  mediaStatusLabel,
  mediaTypeLabel,
  metaLine,
  sourceName
} from '@renderer/lib/mediaFormatting'
import { cn } from '@renderer/lib/utils'
import { averageRating } from '@shared/ratings'
import { mediaItemToOfflineNormalizedMedia } from '@shared/offlineMedia'
import type { MediaType, MetadataSource, NormalizedMedia, ProviderErrorInfo } from '@shared/metadata'

type Status = 'loading' | 'error' | 'done'

function ErrorNote({ message }: { message: string }): JSX.Element {
  return (
    <div className="wt-error">
      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  )
}

interface SeasonsAndEpisodesProps {
  media: NormalizedMedia
  onWatchedChange: () => void
  onRatingChange: () => void
}

function SeasonsAndEpisodes({ media, onWatchedChange, onRatingChange }: SeasonsAndEpisodesProps): JSX.Element {
  const { seasons, loading: seasonsLoading, error: seasonsError } = useSeasons(media)
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null)
  // Tiles are the quick way to tick episodes off. Details is where each one's
  // title, rating, note, and rewatch history live.
  const [view, setView] = useState<'tiles' | 'details'>('tiles')

  useEffect(() => {
    if (seasons.length > 0 && selectedSeason === null) {
      const preferred = seasons.find((season) => season.seasonNumber > 0) ?? seasons[0]
      setSelectedSeason(preferred.seasonNumber)
    }
  }, [seasons, selectedSeason])

  const {
    episodes,
    loading: episodesLoading,
    bulkPending,
    error: episodesError,
    isPending,
    setWatched,
    rate,
    setNotes: setEpisodeNotes,
    setSeasonWatched,
    getHistory
  } = useEpisodes(media, selectedSeason, onWatchedChange, onRatingChange)

  const seasonRating = useSeasonRating(media, selectedSeason)

  async function handleSeasonRatingChange(rating: number | null): Promise<void> {
    await seasonRating.setRating(rating)
    onRatingChange()
  }

  if (seasonsLoading) return <Skeleton className="h-40 rounded-xl" />
  if (seasonsError) return <ErrorNote message={seasonsError} />
  if (seasons.length === 0) return <p className="wt-sub">No season information available.</p>

  const currentSeason = seasons.find((season) => season.seasonNumber === selectedSeason) ?? null

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {seasons.map((season) => (
            <button
              key={season.seasonNumber}
              type="button"
              aria-pressed={selectedSeason === season.seasonNumber}
              className={cn('wt-pill', selectedSeason === season.seasonNumber && 'is-on')}
              onClick={() => setSelectedSeason(season.seasonNumber)}
            >
              {season.title || (season.seasonNumber === 0 ? 'Specials' : `Season ${season.seasonNumber}`)}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="wt-tab-switch">
            {(['tiles', 'details'] as const).map((mode) => (
              <button key={mode} type="button" aria-pressed={view === mode} className={cn('wt-tab', view === mode && 'is-on')} onClick={() => setView(mode)}>
                {mode === 'tiles' ? 'Tiles' : 'Details'}
              </button>
            ))}
          </div>
          <SeasonWatchActions
            pending={bulkPending}
            onMarkWatched={() => void setSeasonWatched(true)}
            onMarkUnwatched={() => void setSeasonWatched(false)}
          />
        </div>
      </div>

      {view === 'tiles' ? (
        episodesLoading ? (
          <Skeleton className="h-32 rounded-xl" />
        ) : episodesError ? (
          <ErrorNote message={episodesError} />
        ) : episodes.length === 0 ? (
          <p className="wt-sub">This season doesn&apos;t have any episode details yet.</p>
        ) : (
          <EpisodeTiles episodes={episodes} isPending={isPending} onToggleWatched={(number, watched) => void setWatched(number, watched)} />
        )
      ) : (
        <>
          {currentSeason && <SeasonSummary season={currentSeason} />}
          <EpisodeList
            episodes={episodes}
            loading={episodesLoading}
            error={episodesError}
            isPending={isPending}
            onToggleWatched={setWatched}
            onRate={rate}
            onLoadHistory={getHistory}
            onSaveNotes={setEpisodeNotes}
          />
        </>
      )}

      {!seasonRating.loading && (
        <SeasonRatingPanel
          rating={seasonRating.rating}
          pending={seasonRating.pending}
          onChange={(rating) => void handleSeasonRatingChange(rating)}
          averageEpisodeRating={averageRating(episodes.map((episode) => episode.rating))}
          notes={seasonRating.notes}
          onSaveNotes={seasonRating.setNotes}
        />
      )}
    </>
  )
}

/** The personal note. Saved when focus leaves the box, so typing doesn't write to disk on every keystroke. */
function PersonalNote({ notes, onSave }: { notes: string | null; onSave: (notes: string | null) => Promise<void> }): JSX.Element {
  const [draft, setDraft] = useState(notes ?? '')

  useEffect(() => {
    setDraft(notes ?? '')
  }, [notes])

  function save(): void {
    const trimmed = draft.trim()
    const next = trimmed.length > 0 ? trimmed : null
    if (next !== notes) void onSave(next)
  }

  return (
    <div className="wt-stack" style={{ gap: 8 }}>
      <span className="wt-label">Personal note</span>
      <textarea
        className="wt-textarea"
        aria-label="Personal note"
        placeholder="Write a personal note…"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={save}
      />
    </div>
  )
}

function MediaDetailBody({ media, offline }: { media: NormalizedMedia; offline: boolean }): JSX.Element {
  const navigate = useNavigate()
  const libraryState = useLibraryState(media)
  const seriesProgress = useSeriesProgress(media)
  const seriesRatingSummary = useSeriesRatingSummary(media)
  const tags = useTags(media)
  const [seriesActionPending, setSeriesActionPending] = useState(false)
  const [seriesActionError, setSeriesActionError] = useState<string | null>(null)
  // Bumped after a series-wide bulk action to force the season/episode
  // subtree to refetch everything fresh, rather than trying to patch
  // potentially many seasons' worth of local state in place.
  const [refreshKey, setRefreshKey] = useState(0)

  function refreshSeries(): void {
    void libraryState.refresh()
    void seriesProgress.refresh()
    invalidateWatchLog()
  }

  function refreshRatings(): void {
    void seriesRatingSummary.refresh()
  }

  async function setSeriesWatched(watched: boolean): Promise<void> {
    setSeriesActionPending(true)
    setSeriesActionError(null)
    const result = await window.api.setSeriesWatched({ media, watched })
    setSeriesActionPending(false)
    if (!result.ok) {
      setSeriesActionError(result.error)
      return
    }
    refreshSeries()
    setRefreshKey((key) => key + 1)
  }

  async function remove(): Promise<void> {
    await libraryState.removeFromLibrary()
    invalidateWatchLog()
    navigate('/library')
  }

  async function toggleMovieWatched(): Promise<void> {
    await libraryState.setStatus(libraryState.watchStatus === 'completed' ? 'plan_to_watch' : 'completed')
    invalidateWatchLog()
  }

  const isMovie = media.mediaType === 'movie'
  const year = extractYear(media.releaseDate)
  const jp = japaneseTitle(media.originalTitle)
  const progress = seriesProgress.progress
  const movieWatched = libraryState.watchStatus === 'completed'
  const summary = seriesRatingSummary.summary

  const nextUpText = progress
    ? progress.isFullyWatched
      ? 'nothing — finished'
      : progress.currentSeasonNumber !== null && progress.currentEpisodeNumber !== null
        ? `Season ${progress.currentSeasonNumber}, Episode ${progress.currentEpisodeNumber}`
        : null
    : null

  return (
    <div className="wt-stack" style={{ gap: 30 }}>
      {offline && (
        <div className="wt-panel" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 14, fontSize: 14, color: 'var(--wt-muted)' }}>
          <WifiOff className="h-4 w-4 shrink-0" />
          <span>
            Showing cached info because the provider couldn&apos;t be reached. Ratings, favorites, notes, tags, and watch
            status still work. Season and episode details may not load until you&apos;re back online.
          </span>
        </div>
      )}

      <div
        className="wt-hero dark"
        style={{
          background: `linear-gradient(120deg, oklch(0.42 0.2 ${posterHues(media.title).hue}) 0%, #17132a 65%)`,
          padding: 36,
          display: 'grid',
          gridTemplateColumns: '230px minmax(0,1fr)',
          gap: 40,
          alignItems: 'start'
        }}
      >
        <div className="wt-sunburst" style={{ left: '20%', top: '30%', width: 1500, height: 1500, margin: '-750px 0 0 -750px', animationDuration: '90s' }} />
        <div className="wt-pop" style={{ position: 'relative', animationDuration: '0.7s', animationDelay: '100ms' }}>
          <Poster title={media.title} originalTitle={media.originalTitle} mediaType={media.mediaType} year={year} image={media.poster} favorite={libraryState.favorite} />
        </div>
        <div className="wt-stack" style={{ position: 'relative', gap: 14, minWidth: 0 }}>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--wt-cyan)' }}>
            {metaLine(
              mediaTypeLabel(media.mediaType),
              year,
              media.numberOfSeasons && !isMovie ? `${media.numberOfSeasons} season${media.numberOfSeasons === 1 ? '' : 's'}` : null,
              lengthText(media.mediaType, media.runtime, media.numberOfEpisodes),
              mediaStatusLabel(media.status)
            )}
          </span>
          <h1 className="wt-hero-title" style={{ fontSize: 'clamp(30px,3.6vw,48px)', lineHeight: 1.06 }}>
            {media.title}
          </h1>
          {jp && (
            <span className="wt-display wt-jp" style={{ fontSize: 18, letterSpacing: '0.12em', color: 'var(--wt-yellow)' }}>
              {jp}
            </span>
          )}
          {media.genres.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {media.genres.map((genre) => (
                <span key={genre} style={{ padding: '4px 11px', borderRadius: 99, border: '1.5px solid rgba(255,255,255,0.25)', fontSize: 12, fontWeight: 700 }}>
                  #{genre}
                </span>
              ))}
            </div>
          )}
          {media.description && (
            <p style={{ margin: 0, maxWidth: '62ch', lineHeight: 1.7, color: '#e3dcf7', whiteSpace: 'pre-line' }}>{media.description}</p>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 4 }}>
            <div className="wt-hero-box">
              <span className="wt-label">My rating</span>
              <RatingStars value={libraryState.rating} onChange={(rating) => void libraryState.setRating(rating)} readOnly={libraryState.pending} size="md" />
            </div>
            <div className="wt-hero-box">
              <span className="wt-label">{sourceName(media.source)}</span>
              <span className="wt-display" style={{ fontSize: 22, color: 'var(--wt-cyan)' }}>
                {media.rating !== null ? media.rating.toFixed(1) : '—'}
              </span>
            </div>
            <div className="wt-hero-box">
              <span className="wt-label">Status</span>
              <WatchStatusSelect value={libraryState.watchStatus} disabled={libraryState.pending} onChange={(status) => void libraryState.setStatus(status)} />
            </div>
          </div>

          {summary && (summary.averageSeasonRating !== null || summary.averageEpisodeRating !== null) && (
            <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 12, color: 'var(--wt-soft)' }}>
              {summary.averageSeasonRating !== null && <span>Average season rating {summary.averageSeasonRating.toFixed(1)}</span>}
              {summary.averageEpisodeRating !== null && <span>Average episode rating {summary.averageEpisodeRating.toFixed(1)}</span>}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginTop: 4 }}>
            {!libraryState.loading && !libraryState.inLibrary && (
              <button type="button" className="wt-btn wt-btn-yellow" disabled={libraryState.pending} onClick={() => void libraryState.addToLibrary()}>
                ＋ Add to library
              </button>
            )}
            <button
              type="button"
              aria-pressed={libraryState.favorite}
              className="wt-btn wt-btn-cream"
              disabled={libraryState.pending}
              style={{ color: libraryState.favorite ? '#d3146b' : 'var(--wt-ink)' }}
              onClick={() => void libraryState.toggleFavorite()}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill={libraryState.favorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
              </svg>
              {libraryState.favorite ? 'Favorite' : 'Add to favorites'}
            </button>
            {isMovie && (
              <button type="button" className="wt-btn wt-btn-pink" disabled={libraryState.pending} onClick={() => void toggleMovieWatched()}>
                {movieWatched ? `Watched ${formatShortDate(libraryState.completedAt)} · undo` : 'Mark as watched'}
              </button>
            )}
            {libraryState.inLibrary && (
              <ConfirmDialog
                trigger={
                  <button type="button" className="wt-ghost wt-ghost-danger" disabled={libraryState.pending} style={{ padding: '10px 16px' }}>
                    Remove
                  </button>
                }
                title={`Remove ${media.title}?`}
                description="This removes it from your library, along with its rating, notes, tags, and watch history."
                confirmLabel="Remove"
                onConfirm={() => void remove()}
              />
            )}
            {isMovie && (
              <WatchHistory
                watchCount={libraryState.completedAt !== null ? libraryState.rewatchCount + 1 : 0}
                onLoadHistory={libraryState.getMovieHistory}
              />
            )}
          </div>
          {libraryState.error && <span style={{ fontSize: 12, color: 'var(--wt-pink)' }}>{libraryState.error}</span>}
        </div>
      </div>

      {!isMovie && (
        <div className="wt-panel wt-stack wt-rise" style={{ gap: 18, padding: 26, borderRadius: 24, animationDelay: '120ms' }}>
          {seriesProgress.loading ? (
            <Skeleton className="h-16 rounded-xl" />
          ) : seriesProgress.error ? (
            <ErrorNote message={seriesProgress.error} />
          ) : progress && progress.totalEpisodes > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
              <span
                className="wt-display"
                style={{ fontSize: 60, lineHeight: 1, background: 'linear-gradient(90deg,#ff4f9a,#ffd84a)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}
              >
                {progress.percentage}%
              </span>
              <div className="wt-stack" style={{ flex: 1, minWidth: 240, gap: 8 }}>
                <span style={{ fontWeight: 700 }}>
                  {progress.watchedEpisodes} of {progress.totalEpisodes} episodes
                  {nextUpText ? ` · next up ${nextUpText}` : ''}
                </span>
                <div className="wt-bar" style={{ height: 12, border: '2px solid var(--wt-ink)' }}>
                  <div className="wt-bar-fill wt-stripes-pink" style={{ width: `${progress.percentage}%`, boxShadow: '0 0 14px rgba(255,79,154,0.7)' }} />
                </div>
              </div>
              <SeriesWatchActions
                pending={seriesActionPending}
                onMarkAllWatched={() => void setSeriesWatched(true)}
                onMarkAllUnwatched={() => void setSeriesWatched(false)}
              />
            </div>
          ) : null}
          {seriesActionError && <ErrorNote message={seriesActionError} />}

          <SeasonsAndEpisodes key={refreshKey} media={media} onWatchedChange={refreshSeries} onRatingChange={refreshRatings} />
        </div>
      )}

      <div className="wt-rise" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,320px),1fr))', gap: 24, animationDelay: '200ms' }}>
        {!libraryState.loading && <PersonalNote notes={libraryState.notes} onSave={libraryState.setNotes} />}
        {!tags.loading && (
          <TagEditor tags={tags.tags} allTags={tags.allTags} pending={tags.pending} onAdd={tags.addTag} onRemove={tags.removeTag} />
        )}
      </div>
    </div>
  )
}

export function MediaDetail(): JSX.Element {
  const { source, mediaType, externalId } = useParams<{
    source: string
    mediaType: string
    externalId: string
  }>()
  const [status, setStatus] = useState<Status>('loading')
  const [media, setMedia] = useState<NormalizedMedia | null>(null)
  const [error, setError] = useState<ProviderErrorInfo | null>(null)
  const [offline, setOffline] = useState(false)

  // Falls back to a fresh Search page only if this Details page was opened
  // with no prior in-app history (e.g. a hard refresh landed here directly)
  // — otherwise this is exactly `navigate(-1)`, which returns to wherever
  // the user actually came from (Search's own query/filter live in its URL,
  // so they come back automatically; see useMediaSearch).
  const goBack = useBackNavigation('/search')

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      const target = event.target as HTMLElement | null
      const isTyping = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      if (event.key === 'Escape' && !isTyping) goBack()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- goBack reads a ref and navigate, both stable for this component's lifetime
  }, [])

  useEffect(() => {
    if (!source || !mediaType || !externalId) return
    let cancelled = false
    setStatus('loading')
    setOffline(false)

    async function load(): Promise<void> {
      const typedSource = source as MetadataSource
      const response = await window.api.getMediaDetails({
        source: typedSource,
        mediaType: mediaType as MediaType,
        externalId: externalId as string
      })
      if (cancelled) return

      if (response.result) {
        setMedia(response.result)
        setStatus('done')
        return
      }

      // The live fetch failed (offline, provider down, bad credentials) —
      // if this title is already in the library, fall back to what's
      // cached locally rather than dead-ending the whole page. Every
      // section that still needs live metadata (seasons/episodes, series
      // progress) handles its own fetch failure already; everything
      // local-only (rating, notes, tags, favorite, watch status) keeps
      // working regardless.
      const cached = await window.api.getLibraryState({ source: typedSource, externalId: externalId as string })
      if (cancelled) return
      const offlineMedia = cached.mediaItem ? mediaItemToOfflineNormalizedMedia(cached.mediaItem) : null
      if (offlineMedia) {
        setMedia(offlineMedia)
        setOffline(true)
        setStatus('done')
      } else {
        setError(response.error)
        setStatus('error')
      }
    }

    load().catch((err: unknown) => {
      if (cancelled) return
      setError({
        source: 'tmdb',
        code: 'unknown',
        message: err instanceof Error ? err.message : String(err)
      })
      setStatus('error')
    })

    return () => {
      cancelled = true
    }
  }, [source, mediaType, externalId])

  return (
    <section className="wt-stack" style={{ gap: 30 }}>
      <div>
        <button type="button" className="wt-back" onClick={goBack}>
          ← Back
        </button>
      </div>

      {status === 'loading' && <Skeleton className="h-96 rounded-[26px]" />}
      {status === 'error' && <ErrorNote message={error?.message ?? 'Could not load details for this title.'} />}
      {status === 'done' && media && <MediaDetailBody media={media} offline={offline} />}
    </section>
  )
}
