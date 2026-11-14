import { cn } from '@renderer/lib/utils'
import { formatShortDate } from '@renderer/lib/mediaFormatting'
import type { EpisodeWithProgress } from '@renderer/hooks/useEpisodes'

interface EpisodeTilesProps {
  episodes: EpisodeWithProgress[]
  isPending: (episodeNumber: number) => boolean
  onToggleWatched: (episodeNumber: number, watched: boolean) => void
}

/** One tile per episode, showing the date it was watched. Clicking a tile flips it. */
export function EpisodeTiles({ episodes, isPending, onToggleWatched }: EpisodeTilesProps): JSX.Element {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(78px,1fr))', gap: 10 }}>
      {episodes.map((episode, index) => {
        const name = episode.title ?? `Episode ${episode.episodeNumber}`
        return (
          <div key={episode.episodeNumber} className="wt-pop" style={{ animationDelay: `${Math.min(index, 24) * 40}ms` }}>
            <button
              type="button"
              className={cn('wt-ep', episode.watched && 'is-on')}
              title={name}
              disabled={isPending(episode.episodeNumber)}
              aria-label={`${episode.watched ? 'Mark unwatched' : 'Mark watched'}: episode ${episode.episodeNumber}, ${name}`}
              onClick={() => onToggleWatched(episode.episodeNumber, !episode.watched)}
            >
              <span className="wt-display" style={{ fontSize: 17, lineHeight: 1 }}>
                E{String(episode.episodeNumber).padStart(2, '0')}
              </span>
              <span style={{ fontSize: 10, fontWeight: 700, opacity: 0.8, minHeight: 12 }}>
                {episode.watched && episode.watchedAt ? formatShortDate(episode.watchedAt) : ''}
              </span>
            </button>
          </div>
        )
      })}
    </div>
  )
}
