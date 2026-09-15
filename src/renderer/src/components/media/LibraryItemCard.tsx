import { Heart, Star } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { watchStatusLabel } from '@renderer/lib/mediaFormatting'
import { StatusBadge } from '@renderer/components/media/StatusBadge'
import { Progress } from '@renderer/components/ui/progress'
import type { LibraryItemDTO } from '@shared/library'

interface LibraryItemCardProps {
  item: LibraryItemDTO
}

export function LibraryItemCard({ item }: LibraryItemCardProps): JSX.Element {
  const navigate = useNavigate()
  const { mediaItem, libraryEntry, progress } = item
  const canOpen = mediaItem.source !== 'manual' && mediaItem.sourceId !== null

  return (
    <button
      type="button"
      disabled={!canOpen}
      onClick={() => canOpen && navigate(`/media/${mediaItem.source}/${mediaItem.type}/${mediaItem.sourceId}`)}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card text-left shadow-sm transition-all duration-200 ease-premium hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg hover:shadow-black/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-60"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-muted">
        {mediaItem.posterPath ? (
          <img
            src={mediaItem.posterPath}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 ease-premium group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center px-2 text-center text-xs text-muted-foreground">
            No poster
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
        <StatusBadge
          kind="type"
          value={mediaItem.type}
          className="absolute left-2 top-2 bg-background/85 backdrop-blur"
        />
        {libraryEntry.favorite && (
          <span className="absolute right-2 top-2 rounded-full bg-background/85 p-1.5 shadow backdrop-blur">
            <Heart className="h-3.5 w-3.5 fill-favorite text-favorite" />
          </span>
        )}
        {progress && (
          <div className="absolute inset-x-0 bottom-0 bg-background/40 px-0 py-0">
            <Progress value={progress.percentage} className="h-1 rounded-none bg-background/40" />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="line-clamp-2 text-sm font-medium leading-snug">{mediaItem.title}</h3>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{watchStatusLabel(libraryEntry.watchStatus)}</span>
          {libraryEntry.rating !== null && (
            <span className="flex items-center gap-1 font-medium text-foreground">
              <Star className="h-3 w-3 fill-primary text-primary" />
              {libraryEntry.rating.toFixed(1)}
            </span>
          )}
        </div>
        {progress && (
          <p className="text-[11px] text-muted-foreground">
            {progress.watchedEpisodes} / {progress.totalEpisodes} episodes &middot; {progress.percentage}%
          </p>
        )}
      </div>
    </button>
  )
}
