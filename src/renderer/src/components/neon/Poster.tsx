import { useState } from 'react'
import { Heart } from 'lucide-react'
import { japaneseTitle, posterGlyph, posterHues } from '@renderer/lib/posterArt'
import { mediaTypeLabel } from '@renderer/lib/mediaFormatting'
import type { MediaType } from '@shared/metadata'

interface PosterProps {
  title: string
  originalTitle: string | null
  mediaType: MediaType
  year: string | null
  /** The provider's real artwork. The generated poster is what's left when there is none, or it can't load (e.g. offline). */
  image: string | null
  favorite?: boolean
}

/** Decorative: every use sits beside the title in text, so it's hidden from assistive tech. */
export function Poster({ title, originalTitle, mediaType, year, image, favorite = false }: PosterProps): JSX.Element {
  const [failedImage, setFailedImage] = useState<string | null>(null)
  const showImage = image !== null && failedImage !== image
  const { hue, hue2 } = posterHues(title)
  const jp = japaneseTitle(originalTitle)

  return (
    <div
      className="wt-poster"
      aria-hidden="true"
      style={{
        background: `linear-gradient(165deg, oklch(0.66 0.21 ${hue}) 0%, oklch(0.42 0.2 ${hue2}) 55%, oklch(0.2 0.1 ${hue2}) 100%)`
      }}
    >
      {showImage ? (
        <img src={image} alt="" className="wt-poster-image" loading="lazy" onError={() => setFailedImage(image)} />
      ) : (
        <>
          <div className="wt-poster-rays" />
          <div className="wt-poster-dots" />
          <div className="wt-poster-glyph">{posterGlyph(title, originalTitle)}</div>
          {jp && !favorite && <div className="wt-poster-jp wt-jp">{jp}</div>}
          <div className="wt-poster-foot">
            {year && <div className="wt-poster-year">{year}</div>}
            <div className="wt-poster-title">{title}</div>
          </div>
        </>
      )}
      <div className="wt-poster-type">{mediaTypeLabel(mediaType)}</div>
      {favorite && (
        <span className="wt-poster-fav">
          <Heart style={{ width: '9cqw', height: '9cqw' }} fill="currentColor" />
        </span>
      )}
    </div>
  )
}
