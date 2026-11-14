import { Poster } from '@renderer/components/neon/Poster'
import { japaneseTitle } from '@renderer/lib/posterArt'
import { extractYear, lengthText, mediaTypeLabel, metaLine, sourceName } from '@renderer/lib/mediaFormatting'
import type { NormalizedMedia } from '@shared/metadata'

interface MediaResultCardProps {
  media: NormalizedMedia
  inLibrary: boolean
  pending: boolean
  delayMs?: number
  onSelect: () => void
  onAdd: () => void
}

export function MediaResultCard({ media, inLibrary, pending, delayMs = 0, onSelect, onAdd }: MediaResultCardProps): JSX.Element {
  const year = extractYear(media.releaseDate)
  const jp = japaneseTitle(media.originalTitle)

  return (
    <div className="wt-rise" style={{ animationDelay: `${delayMs}ms` }}>
      <div className="wt-panel" style={{ display: 'grid', gridTemplateColumns: '76px minmax(0,1fr) auto', gap: 22, alignItems: 'center', padding: '14px 18px', borderRadius: 20 }}>
        <div onClick={onSelect} style={{ cursor: 'pointer' }}>
          <Poster title={media.title} originalTitle={media.originalTitle} mediaType={media.mediaType} year={year} image={media.poster} />
        </div>
        <div className="wt-stack" style={{ gap: 5, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" className="wt-display" style={{ fontSize: 19, textAlign: 'left', cursor: 'pointer' }} onClick={onSelect}>
              {media.title}
            </button>
            {jp && (
              <span className="wt-jp" style={{ fontSize: 13, color: 'var(--wt-a3)' }}>
                {jp}
              </span>
            )}
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--wt-a2)' }}>
            {metaLine(
              mediaTypeLabel(media.mediaType),
              year,
              lengthText(media.mediaType, media.runtime, media.numberOfEpisodes),
              `via ${sourceName(media.source)}`
            )}
          </span>
          {media.description && (
            <p className="line-clamp-2" style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'var(--wt-soft)', maxWidth: '72ch' }}>
              {media.description}
            </p>
          )}
        </div>
        <button
          type="button"
          className={inLibrary ? 'wt-btn wt-btn-flat' : 'wt-btn wt-btn-yellow'}
          disabled={inLibrary || pending}
          onClick={onAdd}
        >
          {inLibrary ? 'In library' : 'Add to library'}
        </button>
      </div>
    </div>
  )
}
