import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ArrowLeft, TriangleAlert, WifiOff } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { Skeleton } from '@renderer/components/ui/skeleton'
import { MediaHeader } from '@renderer/components/media/MediaHeader'
import { RatingComparison } from '@renderer/components/media/RatingComparison'
import { LibraryActionsBar } from '@renderer/components/media/LibraryActionsBar'
import { MovieWatchedToggle } from '@renderer/components/media/MovieWatchedToggle'
import { WatchStatusSelect } from '@renderer/components/media/WatchStatusSelect'
import { SeriesProgressSummary } from '@renderer/components/media/SeriesProgressSummary'
import { SeriesWatchActions } from '@renderer/components/media/SeriesWatchActions'
import { SeasonTabs } from '@renderer/components/media/SeasonTabs'
import { SeasonSummary } from '@renderer/components/media/SeasonSummary'
import { SeasonWatchActions } from '@renderer/components/media/SeasonWatchActions'
import { SeasonRatingPanel } from '@renderer/components/media/SeasonRatingPanel'
import { EpisodeList } from '@renderer/components/media/EpisodeList'
import { WatchHistory } from '@renderer/components/media/WatchHistory'
import { NotesEditor } from '@renderer/components/media/NotesEditor'
import { TagEditor } from '@renderer/components/media/TagEditor'
import { useLibraryState } from '@renderer/hooks/useLibraryState'
import { useSeriesProgress } from '@renderer/hooks/useSeriesProgress'
import { useSeriesRatingSummary } from '@renderer/hooks/useSeriesRatingSummary'
import { useSeasons } from '@renderer/hooks/useSeasons'
import { useSeasonRating } from '@renderer/hooks/useSeasonRating'
import { useEpisodes } from '@renderer/hooks/useEpisodes'
import { useTags } from '@renderer/hooks/useTags'
import { useBackNavigation } from '@renderer/hooks/useBackNavigation'
import { averageRating } from '@shared/ratings'
import { mediaItemToOfflineNormalizedMedia } from '@shared/offlineMedia'
import type { MediaType, MetadataSource, NormalizedMedia, ProviderErrorInfo } from '@shared/metadata'

type Status = 'loading' | 'error' | 'done'

interface SeasonsAndEpisodesProps {
  media: NormalizedMedia
  onWatchedChange: () => void
  onRatingChange: () => void
}

function SeasonsAndEpisodes({ media, onWatchedChange, onRatingChange }: SeasonsAndEpisodesProps): JSX.Element {
  const { seasons, loading: seasonsLoading, error: seasonsError } = useSeasons(media)
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null)

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

  if (seasonsLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-16 rounded-xl" />
      </div>
    )
  }

  if (seasonsError) {
    return (
      <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{seasonsError}</span>
      </div>
    )
  }

  if (seasons.length === 0) {
    return <p className="text-sm text-muted-foreground">No season information available.</p>
  }

  const currentSeason = seasons.find((season) => season.seasonNumber === selectedSeason) ?? null

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SeasonTabs seasons={seasons} selected={selectedSeason} onSelect={setSelectedSeason} />
        <SeasonWatchActions
          pending={bulkPending}
          onMarkWatched={() => void setSeasonWatched(true)}
          onMarkUnwatched={() => void setSeasonWatched(false)}
        />
      </div>

      {currentSeason && <SeasonSummary season={currentSeason} />}

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
    </div>
  )
}

function MediaDetailBody({ media, offline }: { media: NormalizedMedia; offline: boolean }): JSX.Element {
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

  return (
    <div className="space-y-6">
      {offline && (
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          <WifiOff className="h-4 w-4 shrink-0" />
          <span>
            Showing cached info — the provider couldn&apos;t be reached. Ratings, favorites, notes, tags, and watch
            status still work; season and episode details may not load until you&apos;re back online.
          </span>
        </div>
      )}
      <MediaHeader media={media} />
      <RatingComparison
        media={media}
        personalRating={libraryState.rating}
        pending={libraryState.pending}
        onChange={(rating) => void libraryState.setRating(rating)}
        seriesSummary={seriesRatingSummary.summary}
      />
      <LibraryActionsBar libraryState={libraryState} />

      {!tags.loading && (
        <TagEditor
          tags={tags.tags}
          allTags={tags.allTags}
          pending={tags.pending}
          onAdd={tags.addTag}
          onRemove={tags.removeTag}
        />
      )}

      <NotesEditor notes={libraryState.notes} onSave={libraryState.setNotes} placeholder="Write a personal note…" />

      {media.mediaType === 'movie' ? (
        <div className="flex flex-wrap items-center gap-3">
          <MovieWatchedToggle
            watchStatus={libraryState.watchStatus}
            pending={libraryState.pending}
            onSetStatus={(status) => void libraryState.setStatus(status)}
          />
          <WatchHistory
            watchCount={libraryState.completedAt !== null ? libraryState.rewatchCount + 1 : 0}
            onLoadHistory={libraryState.getMovieHistory}
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <WatchStatusSelect
              value={libraryState.watchStatus}
              disabled={libraryState.pending}
              onChange={(status) => void libraryState.setStatus(status)}
            />
            {seriesProgress.progress && seriesProgress.progress.totalEpisodes > 0 && (
              <SeriesWatchActions
                pending={seriesActionPending}
                onMarkAllWatched={() => void setSeriesWatched(true)}
                onMarkAllUnwatched={() => void setSeriesWatched(false)}
              />
            )}
          </div>
          {seriesActionError && <p className="text-xs text-destructive">{seriesActionError}</p>}

          {seriesProgress.loading ? (
            <Skeleton className="h-20 rounded-xl" />
          ) : seriesProgress.error ? (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{seriesProgress.error}</span>
            </div>
          ) : seriesProgress.progress ? (
            <SeriesProgressSummary progress={seriesProgress.progress} />
          ) : null}

          <SeasonsAndEpisodes
            key={refreshKey}
            media={media}
            onWatchedChange={refreshSeries}
            onRatingChange={refreshRatings}
          />
        </div>
      )}
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
    <div className="space-y-6">
      <Button variant="ghost" size="sm" className="-ml-2 gap-1" onClick={goBack}>
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      {status === 'loading' && (
        <div className="space-y-4">
          <Skeleton className="h-56 w-full rounded-xl" />
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      )}

      {status === 'error' && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error?.message ?? 'Could not load details for this title.'}</span>
        </div>
      )}

      {status === 'done' && media && <MediaDetailBody media={media} offline={offline} />}
    </div>
  )
}
