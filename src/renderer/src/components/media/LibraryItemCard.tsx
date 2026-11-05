import { useNavigate } from 'react-router-dom'
import { Poster } from '@renderer/components/neon/Poster'
import { extractYear, formatShortDate, mediaPath, ratingLabel, watchStatusLabel } from '@renderer/lib/mediaFormatting'
import { japaneseTitle } from '@renderer/lib/posterArt'
import type { LibraryItemDTO } from '@shared/library'

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
  const { mediaItem, libraryEntry, progress } = item
  const path = mediaPath(mediaItem)
  const percent = progress?.percentage ?? (libraryEntry.watchStatus === 'completed' ? 100 : 0)
  const jp = japaneseTitle(mediaItem.originalTitle)

  return (
    <div className="wt-rise" style={{ animationDelay: `${delayMs}ms` }}>
      <button
        type="button"
        className="wt-lift wt-stack"
        disabled={!path}
        aria-label={mediaItem.title}
        style={{ width: '100%', gap: 10, textAlign: 'left', cursor: path ? 'pointer' : 'default' }}
        onClick={() => path && navigate(path)}
      >
        <Poster
          title={mediaItem.title}
          originalTitle={mediaItem.originalTitle}
          mediaType={mediaItem.type}
          year={extractYear(mediaItem.releaseDate)}
          image={mediaItem.posterPath}
          favorite={libraryEntry.favorite}
        />
        <div className="wt-stack" style={{ gap: 2, width: '100%', minWidth: 0, marginTop: 2 }}>
          <span className="wt-display wt-truncate" style={{ fontSize: 14 }}>
            {mediaItem.title}
          </span>
          {jp && (
            <span className="wt-jp wt-truncate" style={{ fontSize: 11, color: 'var(--wt-muted)' }}>
              {jp}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, width: '100%' }}>
          <span className="wt-status-tag">{watchStatusLabel(libraryEntry.watchStatus)}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--wt-a3)', whiteSpace: 'nowrap' }}>{ratingLabel(libraryEntry.rating)}</span>
        </div>
        <div className="wt-bar" style={{ height: 6, width: '100%' }}>
          <div className="wt-bar-fill wt-gradient-fill" style={{ width: `${percent}%` }} />
        </div>
        <span className="wt-tabular" style={{ fontSize: 12, color: 'var(--wt-muted)', minHeight: 18 }}>
          {libraryProgressText(item)}
        </span>
      </button>
    </div>
  )
}
