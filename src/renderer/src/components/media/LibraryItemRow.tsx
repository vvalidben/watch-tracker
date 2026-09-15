import { Heart, Star } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { extractYear } from '@renderer/lib/mediaFormatting'
import { StatusBadge } from '@renderer/components/media/StatusBadge'
import { Progress } from '@renderer/components/ui/progress'
import type { LibraryItemDTO } from '@shared/library'

interface LibraryItemRowProps {
  item: LibraryItemDTO
}

export function LibraryItemRow({ item }: LibraryItemRowProps): JSX.Element {
  const navigate = useNavigate()
  const { mediaItem, libraryEntry, progress } = item
  const canOpen = mediaItem.source !== 'manual' && mediaItem.sourceId !== null
  const year = extractYear(mediaItem.releaseDate)

  return (
    <button
      type="button"
      disabled={!canOpen}
      onClick={() => canOpen && navigate(`/media/${mediaItem.source}/${mediaItem.type}/${mediaItem.sourceId}`)}
      className="group flex w-full items-center gap-3 rounded-xl border border-border bg-card p-2.5 text-left transition-colors duration-150 hover:border-primary/40 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-60"
    >
      <div className="h-16 w-11 shrink-0 overflow-hidden rounded-md bg-muted">
        {mediaItem.posterPath && (
          <img src={mediaItem.posterPath} alt="" className="h-full w-full object-cover" loading="lazy" />
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-sm font-medium">{mediaItem.title}</h3>
          {libraryEntry.favorite && <Heart className="h-3.5 w-3.5 shrink-0 fill-favorite text-favorite" />}
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <StatusBadge kind="type" value={mediaItem.type} />
          <StatusBadge kind="watch" value={libraryEntry.watchStatus} />
          {year && <span>{year}</span>}
        </div>
        {progress && (
          <div className="flex max-w-xs items-center gap-2 pt-0.5">
            <Progress value={progress.percentage} className="h-1" />
            <span className="shrink-0 text-[11px] text-muted-foreground">
              {progress.watchedEpisodes}/{progress.totalEpisodes} &middot; {progress.percentage}%
            </span>
          </div>
        )}
      </div>

      {libraryEntry.rating !== null && (
        <span className="flex shrink-0 items-center gap-1 text-sm font-medium">
          <Star className="h-3.5 w-3.5 fill-primary text-primary" />
          {libraryEntry.rating.toFixed(1)}
        </span>
      )}
    </button>
  )
}
