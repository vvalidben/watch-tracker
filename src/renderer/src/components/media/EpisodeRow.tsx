import { Check } from 'lucide-react'
import { Badge } from '@renderer/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/ui/tooltip'
import { cn } from '@renderer/lib/utils'
import { NotesEditor } from './NotesEditor'
import { RatingStars } from './RatingStars'
import { WatchHistory } from './WatchHistory'
import type { EpisodeWithProgress } from '@renderer/hooks/useEpisodes'

interface EpisodeRowProps {
  episode: EpisodeWithProgress
  pending: boolean
  /** True for the first unwatched episode in the season's list — highlighted as "up next". */
  isNextUp?: boolean
  onToggleWatched: () => void
  onRate: (rating: number | null) => void
  onLoadHistory: () => Promise<string[]>
  onSaveNotes: (notes: string | null) => Promise<void>
}

function formatRuntime(minutes: number | null): string | null {
  return minutes ? `${minutes} min` : null
}

export function EpisodeRow({
  episode,
  pending,
  isNextUp = false,
  onToggleWatched,
  onRate,
  onLoadHistory,
  onSaveNotes
}: EpisodeRowProps): JSX.Element {
  const runtime = formatRuntime(episode.runtimeMinutes)
  const highlightNext = isNextUp && !episode.watched

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-xl border p-4 transition-colors duration-150 sm:flex-row sm:items-start sm:justify-between',
        episode.watched ? 'border-border/60 bg-muted/20' : 'border-border bg-card',
        highlightNext && 'border-primary/50 bg-primary/[0.04] shadow-sm shadow-primary/5'
      )}
    >
      <div className="flex flex-1 gap-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={episode.watched ? 'Mark episode unwatched' : 'Mark episode watched'}
              disabled={pending}
              onClick={onToggleWatched}
              className={cn(
                'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                'disabled:cursor-not-allowed disabled:opacity-50',
                episode.watched
                  ? 'border-success bg-success text-success-foreground'
                  : 'border-muted-foreground/40 text-transparent hover:border-primary hover:text-primary/40'
              )}
            >
              <Check className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>{episode.watched ? 'Mark unwatched' : 'Mark watched'}</TooltipContent>
        </Tooltip>

        <div className={cn('min-w-0 flex-1 space-y-1', episode.watched && 'opacity-60')}>
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-sm font-medium text-muted-foreground">E{episode.episodeNumber}</span>
            <h4 className="text-sm font-medium">{episode.title ?? `Episode ${episode.episodeNumber}`}</h4>
            {highlightNext && (
              <Badge variant="default" className="text-[10px] uppercase tracking-wide">
                Up next
              </Badge>
            )}
          </div>
          {episode.overview && <p className="line-clamp-2 text-xs text-muted-foreground">{episode.overview}</p>}
          <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
            {episode.airDate && <span>{episode.airDate}</span>}
            {runtime && <span>{runtime}</span>}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-3 pl-9 sm:flex-col sm:items-end sm:gap-2 sm:pl-0">
        <RatingStars value={episode.rating} onChange={onRate} />
        <WatchHistory watchCount={episode.watchCount} onLoadHistory={onLoadHistory} />
        <NotesEditor notes={episode.notes} onSave={onSaveNotes} placeholder="Note on this episode…" collapsible />
      </div>
    </div>
  )
}
