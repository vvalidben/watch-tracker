import { Play } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Progress } from '@renderer/components/ui/progress'
import type { LibraryItemDTO } from '@shared/library'

interface ContinueWatchingCardProps {
  item: LibraryItemDTO
}

/**
 * A larger, richer card for the dashboard's "Continue Watching" shelf.
 * Season/episode-level position (e.g. "Season 2 · Episode 5") would require a
 * live provider call per item to know each season's episode count — the
 * dashboard intentionally avoids that (see progress.ts: computeSeriesProgress
 * hits the network) so it stays fast and fully usable offline. It shows the
 * cheaper, already-cached watched/total episode count instead.
 */
export function ContinueWatchingCard({ item }: ContinueWatchingCardProps): JSX.Element {
  const navigate = useNavigate()
  const { mediaItem, progress } = item
  const canOpen = mediaItem.source !== 'manual' && mediaItem.sourceId !== null
  const pct = progress?.percentage ?? 0

  return (
    <button
      type="button"
      disabled={!canOpen}
      onClick={() => canOpen && navigate(`/media/${mediaItem.source}/${mediaItem.type}/${mediaItem.sourceId}`)}
      className="group flex w-72 shrink-0 items-stretch gap-3 overflow-hidden rounded-xl border border-border bg-card p-3 text-left shadow-sm transition-all duration-200 ease-premium hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-black/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-60"
    >
      <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
        {mediaItem.posterPath ? (
          <img
            src={mediaItem.posterPath}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 ease-premium group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-center text-[10px] text-muted-foreground">
            No poster
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <Play className="h-6 w-6 fill-white text-white" />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{mediaItem.title}</h3>
        {progress ? (
          <>
            <p className="text-xs text-muted-foreground">
              {progress.watchedEpisodes} / {progress.totalEpisodes} episodes
            </p>
            <div className="flex items-center gap-2">
              <Progress value={pct} className="h-1.5" />
              <span className="shrink-0 text-[11px] font-medium tabular-nums text-muted-foreground">{pct}%</span>
            </div>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">Not started</p>
        )}
      </div>
    </button>
  )
}
