import { extractYear, formatRuntime } from '@renderer/lib/mediaFormatting'
import { StatusBadge } from '@renderer/components/media/StatusBadge'
import { Badge } from '@renderer/components/ui/badge'
import { cn } from '@renderer/lib/utils'
import type { NormalizedMedia } from '@shared/metadata'

interface MediaHeaderProps {
  media: NormalizedMedia
}

export function MediaHeader({ media }: MediaHeaderProps): JSX.Element {
  const year = extractYear(media.releaseDate)

  return (
    <div className="space-y-5">
      {media.backdrop && (
        <div className="relative aspect-[16/7] w-full overflow-hidden rounded-xl bg-muted sm:aspect-[16/5]">
          <img src={media.backdrop} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-hero-fade" />
        </div>
      )}

      <div
        className={cn(
          'flex flex-col gap-5 sm:flex-row sm:items-end',
          media.backdrop && 'relative px-1 sm:-mt-16 lg:-mt-20'
        )}
      >
        <div className="w-32 shrink-0 overflow-hidden rounded-xl bg-muted shadow-lg ring-1 ring-border sm:w-44">
          {media.poster ? (
            <img src={media.poster} alt="" className="aspect-[2/3] w-full object-cover" />
          ) : (
            <div className="flex aspect-[2/3] w-full items-center justify-center text-center text-xs text-muted-foreground">
              No poster
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2.5 pb-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge kind="type" value={media.mediaType} />
            <StatusBadge kind="airing" value={media.status} />
          </div>

          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{media.title}</h2>
          {media.originalTitle && <p className="text-sm text-muted-foreground">{media.originalTitle}</p>}

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span>{year ?? 'Unknown year'}</span>
            {media.numberOfSeasons !== null && (
              <span>
                {media.numberOfSeasons} season{media.numberOfSeasons === 1 ? '' : 's'}
              </span>
            )}
            {media.numberOfEpisodes !== null && <span>{media.numberOfEpisodes} episodes</span>}
            {media.runtime != null && <span>{formatRuntime(media.runtime)}</span>}
          </div>

          {media.genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {media.genres.map((genre) => (
                <Badge key={genre} variant="outline">
                  {genre}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {media.description && (
        <p className="max-w-3xl whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
          {media.description}
        </p>
      )}
    </div>
  )
}
