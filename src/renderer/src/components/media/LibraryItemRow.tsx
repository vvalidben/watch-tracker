import { useNavigate } from 'react-router-dom'
import { Poster } from '@renderer/components/neon/Poster'
import { libraryProgressText } from '@renderer/components/media/LibraryItemCard'
import { japaneseTitle } from '@renderer/lib/posterArt'
import {
  extractYear,
  formatShortDate,
  mediaPath,
  mediaTypeLabel,
  ratingLabel,
  watchStatusLabel
} from '@renderer/lib/mediaFormatting'
import type { LibraryItemDTO } from '@shared/library'

interface LibraryItemRowProps {
  item: LibraryItemDTO
  delayMs?: number
}

export function LibraryItemRow({ item, delayMs = 0 }: LibraryItemRowProps): JSX.Element {
  const navigate = useNavigate()
  const { mediaItem, libraryEntry } = item
  const path = mediaPath(mediaItem)
  const jp = japaneseTitle(mediaItem.originalTitle)

  return (
    <div className="wt-rise" style={{ animationDelay: `${delayMs}ms` }}>
      <button type="button" className="wt-row wt-lib-row" disabled={!path} onClick={() => path && navigate(path)}>
        <Poster
          title={mediaItem.title}
          originalTitle={mediaItem.originalTitle}
          mediaType={mediaItem.type}
          year={extractYear(mediaItem.releaseDate)}
          image={mediaItem.posterPath}
          favorite={libraryEntry.favorite}
        />
        <div className="wt-stack" style={{ minWidth: 0 }}>
          <span className="wt-display wt-truncate" style={{ fontSize: 15 }}>
            {mediaItem.title}
          </span>
          {jp && (
            <span className="wt-jp wt-truncate" style={{ fontSize: 11, color: 'var(--wt-muted)' }}>
              {jp}
            </span>
          )}
        </div>
        <span className="wt-lib-optional" style={{ fontSize: 13 }}>
          {mediaTypeLabel(mediaItem.type)}
        </span>
        <span className="wt-status-tag" style={{ justifySelf: 'start' }}>
          {watchStatusLabel(libraryEntry.watchStatus)}
        </span>
        <span className="wt-tabular" style={{ fontSize: 12, color: 'var(--wt-muted)' }}>
          {libraryProgressText(item)}
        </span>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--wt-a3)' }}>{ratingLabel(libraryEntry.rating)}</span>
        <span className="wt-lib-optional" style={{ fontSize: 12, color: 'var(--wt-muted)' }}>
          {formatShortDate(item.lastWatchedAt)}
        </span>
      </button>
    </div>
  )
}
