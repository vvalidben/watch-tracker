import { useNavigate } from 'react-router-dom'
import { ArrowUpRight, Star } from 'lucide-react'
import { Poster } from '@renderer/components/neon/Poster'
import { extractYear, formatShortDate, mediaPath, ratingLabel, watchStatusLabel } from '@renderer/lib/mediaFormatting'
import { japaneseTitle } from '@renderer/lib/posterArt'
import type { LibraryItemDTO } from '@shared/library'
import { usePointerSurface } from '@renderer/hooks/usePointerSurface'
import { useScrollReveal } from '@renderer/hooks/useScrollReveal'

/** "20 / 28 · 71%" for a series, "Watched 5 Nov" or a runtime for a film. */
export function libraryProgressText(item: LibraryItemDTO): string {
  const { progress, mediaItem, libraryEntry } = item
  if (progress) return `${progress.watchedEpisodes} / ${progress.totalEpisodes} · ${progress.percentage}%`
  if (libraryEntry.watchStatus === 'completed') return `Watched ${formatShortDate(item.lastWatchedAt ?? libraryEntry.completedAt)}`
  return mediaItem.runtimeMinutes ? `${mediaItem.runtimeMinutes} min` : ''
}

interface LibraryItemCardProps {
  item: LibraryItemDTO
  delayMs?: number
}

export function LibraryItemCard({ item, delayMs = 0 }: LibraryItemCardProps): JSX.Element {
  const navigate = useNavigate()
  const surface = usePointerSurface()
  const reveal = useScrollReveal()
  const { mediaItem, libraryEntry, progress } = item
  const path = mediaPath(mediaItem)
  const percent = progress?.percentage ?? (libraryEntry.watchStatus === 'completed' ? 100 : 0)
  const jp = japaneseTitle(mediaItem.originalTitle)

  return (
    <div ref={reveal} className="wt-library-item wt-rise" style={{ animationDelay: `${Math.min(delayMs, 240)}ms` }}>
      <button
        type="button"
        className="wt-library-card"
        {...surface}
        disabled={!path}
        aria-label={mediaItem.title}
        onClick={() => path && navigate(path)}
      >
        <span className="wt-library-cover"><Poster
          title={mediaItem.title}
          originalTitle={mediaItem.originalTitle}
          mediaType={mediaItem.type}
          year={extractYear(mediaItem.releaseDate)}
          image={mediaItem.posterPath}
          favorite={libraryEntry.favorite}
        /><span className="wt-library-open" aria-hidden="true"><span>Open details</span><ArrowUpRight size={18} /></span></span>
        <span className="wt-library-body">
        <span className="wt-library-heading">
          <span className="wt-library-title">
            {mediaItem.title}
          </span>
          {jp && (
            <span className="wt-jp wt-library-original">
              {jp}
            </span>
          )}
        </span>
        {mediaItem.overview && <span className="wt-library-synopsis">{mediaItem.overview}</span>}
        <span className="wt-library-facts">
          <span className="wt-library-year">{extractYear(mediaItem.releaseDate) ?? 'Year unknown'}</span>
          <span className="wt-library-rating"><Star size={11} aria-hidden="true" fill={libraryEntry.rating === null ? 'none' : 'currentColor'} />{ratingLabel(libraryEntry.rating)}</span>
        </span>
        <span className="wt-library-status">
          <span className="wt-status-tag">{watchStatusLabel(libraryEntry.watchStatus)}</span>
          {progress && <span className="wt-library-percent">{percent}%</span>}
        </span>
        <span className="wt-bar wt-library-progress">
          <span className="wt-bar-fill wt-gradient-fill" style={{ display: 'block', width: `${percent}%` }} />
        </span>
        <span className="wt-tabular wt-library-progress-text">
          {libraryProgressText(item)}
        </span>
        </span>
      </button>
    </div>
  )
}
