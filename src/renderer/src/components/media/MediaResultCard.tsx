import { Star } from 'lucide-react'
import { extractYear } from '@renderer/lib/mediaFormatting'
import { StatusBadge } from '@renderer/components/media/StatusBadge'
import type { NormalizedMedia } from '@shared/metadata'

interface MediaResultCardProps {
  media: NormalizedMedia
  onSelect: () => void
}

export function MediaResultCard({ media, onSelect }: MediaResultCardProps): JSX.Element {
  const year = extractYear(media.releaseDate)

  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card text-left shadow-sm transition-all duration-200 ease-premium hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg hover:shadow-black/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-muted">
        {media.poster ? (
          <img
            src={media.poster}
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
          value={media.mediaType}
          className="absolute left-2 top-2 bg-background/85 backdrop-blur"
        />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="line-clamp-2 text-sm font-medium leading-snug">{media.title}</h3>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{year ?? 'Unknown year'}</span>
          {media.rating !== null && (
            <span className="flex items-center gap-1 font-medium text-foreground">
              <Star className="h-3 w-3 fill-primary text-primary" />
              {media.rating.toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
