import type { NormalizedSeason } from '@shared/metadata'

interface SeasonSummaryProps {
  season: NormalizedSeason
}

/** The selected season's own metadata (poster/overview/air date/episode count) — separate from personal rating/notes, shown alongside it. */
export function SeasonSummary({ season }: SeasonSummaryProps): JSX.Element {
  const title = season.title || (season.seasonNumber === 0 ? 'Specials' : `Season ${season.seasonNumber}`)

  return (
    <div className="flex gap-4 rounded-xl border border-border bg-card p-4">
      <div className="h-28 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
        {season.poster ? (
          <img src={season.poster} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-center text-[10px] text-muted-foreground">
            No poster
          </div>
        )}
      </div>
      <div className="min-w-0 space-y-1.5">
        <h4 className="text-sm font-semibold">{title}</h4>
        <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
          {season.airDate && <span>{season.airDate}</span>}
          {season.episodeCount !== null && <span>{season.episodeCount} episodes</span>}
        </div>
        {season.overview && <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">{season.overview}</p>}
      </div>
    </div>
  )
}
