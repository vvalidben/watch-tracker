import { Star } from 'lucide-react'
import { RatingStars } from './RatingStars'
import { sourceRatingLabel } from '@renderer/lib/mediaFormatting'
import type { NormalizedMedia } from '@shared/metadata'
import type { SeriesRatingSummaryDTO } from '@shared/library'

interface RatingComparisonProps {
  media: NormalizedMedia
  personalRating: number | null
  pending: boolean
  onChange: (rating: number | null) => void
  /** tv/anime only — series-wide rollups computed from season/episode ratings. */
  seriesSummary?: SeriesRatingSummaryDTO | null
}

/**
 * The external score (TMDB/AniList community rating) and this app's own
 * personal rating are deliberately laid out side by side with distinct
 * labels — never merged into one number — so it's always clear which is
 * which. "My Rating" gets the primary/gold accent treatment since it's the
 * personal, cared-about number; the external score reads as neutral/muted
 * reference info.
 */
export function RatingComparison({
  media,
  personalRating,
  pending,
  onChange,
  seriesSummary
}: RatingComparisonProps): JSX.Element {
  const hasRollups =
    seriesSummary && (seriesSummary.averageSeasonRating !== null || seriesSummary.averageEpisodeRating !== null)

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Star className="h-5 w-5 fill-current" />
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {sourceRatingLabel(media.source)}
            </p>
            <p className="text-xl font-semibold leading-tight text-foreground">
              {media.rating !== null ? media.rating.toFixed(1) : '—'}
            </p>
          </div>
        </div>

        <div className="hidden h-12 w-px bg-border sm:block" />

        <div className="flex items-center gap-3 rounded-lg border border-primary/25 bg-primary/10 px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">My Rating</p>
            <div className="mt-1.5">
              <RatingStars value={personalRating} onChange={onChange} readOnly={pending} size="md" />
            </div>
          </div>
        </div>
      </div>

      {hasRollups && (
        <div className="flex flex-wrap gap-x-6 gap-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
          {seriesSummary!.averageSeasonRating !== null && (
            <span>
              Avg. Season Rating:{' '}
              <span className="font-medium text-foreground">{seriesSummary!.averageSeasonRating!.toFixed(1)}</span>
            </span>
          )}
          {seriesSummary!.averageEpisodeRating !== null && (
            <span>
              Avg. Episode Rating:{' '}
              <span className="font-medium text-foreground">{seriesSummary!.averageEpisodeRating!.toFixed(1)}</span>
            </span>
          )}
        </div>
      )}
    </div>
  )
}
