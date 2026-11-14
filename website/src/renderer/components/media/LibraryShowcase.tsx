import { useId, useState } from 'react'
import { ArrowDown, ArrowUpRight, ChevronLeft, ChevronRight, Heart, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Poster } from '@renderer/components/neon/Poster'
import { PageTitle } from '@renderer/components/neon/PageTitle'
import { useVisualStyle, VISUAL_STYLES } from '@renderer/lib/visualStyle'
import { extractYear, lengthText, mediaPath, mediaTypeLabel, metaLine, watchStatusLabel } from '@renderer/lib/mediaFormatting'
import type { LibraryItemDTO } from '@shared/library'

const EDITIONS = {
  neon: ['THE MAIN CHARACTER SHELF', 'Your next obsession lives here.'],
  'old-school': ['FROM THE VIEWING JOURNAL', 'A collection worth keeping.'],
  cinema: ['TONIGHT AT YOUR PICTURE HOUSE', 'The best seat is your own.'],
  minimal: ['A LITTLE TIME, WELL SPENT', 'Your stories. Beautifully collected.'],
  aurora: ['A UNIVERSE OF YOUR OWN', 'Find a world to disappear into.'],
  sunset: ['THE GOLDEN HOUR SELECTION', 'Good stories deserve another spin.'],
  ocean: ['BELOW THE SURFACE', 'There is always another story.'],
  carbon: ['PERSONAL ARCHIVE / SELECTED', 'Every frame has a place.']
} as const

export function LibraryShowcase({ items, total, onBrowse }: { items: LibraryItemDTO[]; total: number; onBrowse: () => void }): JSX.Element {
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const style = useVisualStyle()
  const navigate = useNavigate()
  const headingId = useId()
  const candidates = items.slice(0, 5)
  const index = Math.max(0, candidates.findIndex((item) => item.mediaItem.id === selectedId))
  const selected = candidates[index]
  if (!selected) return <PageTitle number="02" jp="書庫" title="Library" subtitle={`${total} titles`} />
  const { mediaItem: media, libraryEntry: entry, progress } = selected
  const path = mediaPath(media)
  const atmosphere = VISUAL_STYLES.find((choice) => choice.id === style) ?? VISUAL_STYLES[0]
  const background = media.backdropPath ?? media.posterPath
  const select = (next: number): void => setSelectedId(candidates[(next + candidates.length) % candidates.length].mediaItem.id)

  return <section className={`wt-showcase wt-showcase-${style} wt-rise`} aria-labelledby={headingId}>
    <div className="wt-showcase-backdrop" key={background ?? media.id} aria-hidden="true">
      {background && <img src={background} alt="" onError={(event) => { event.currentTarget.hidden = true }} />}
    </div>
    <div className="wt-showcase-shade" aria-hidden="true" />
    <div className="wt-showcase-top"><div><span className="wt-showcase-eyebrow">THE PERSONAL COLLECTION</span><h1 id={headingId}>Library<span>{String(total).padStart(2, '0')} titles</span></h1></div><span className="wt-showcase-edition"><i />{atmosphere.name} edition</span></div>
    <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">Featured title {index + 1} of {candidates.length}: {media.title}</span>
    <div className="wt-showcase-content" key={`${style}-${media.id}`}>
      <div className="wt-showcase-copy">
        <span className="wt-showcase-kicker"><Sparkles size={12} />{EDITIONS[style][0]}</span>
        <h2>{media.title}</h2>
        <span className="wt-showcase-meta">{metaLine(mediaTypeLabel(media.type), extractYear(media.releaseDate), lengthText(media.type, media.runtimeMinutes, media.numberOfEpisodes))}</span>
        {media.overview ? <p className="wt-showcase-overview">{media.overview}</p> : <p className="wt-showcase-overview">{EDITIONS[style][1]}</p>}
        <div className="wt-showcase-tags"><span>{watchStatusLabel(entry.watchStatus)}</span>{entry.favorite && <span><Heart size={10} fill="currentColor" />A favourite</span>}{progress && <span>{progress.watchedEpisodes} / {progress.totalEpisodes} episodes</span>}</div>
        <div className="wt-showcase-actions"><button className="wt-btn wt-btn-pink" type="button" disabled={!path} onClick={() => path && navigate(path)}>Open title<ArrowUpRight size={16} /></button><button className="wt-showcase-browse" type="button" onClick={onBrowse}>Browse collection<ArrowDown size={13} /></button></div>
      </div>
      <div className="wt-showcase-art" aria-hidden="true">
        <span className="wt-showcase-orbits"><i /><i /><i /></span>
        <span className="wt-showcase-disc"><i /></span>
        <span className="wt-showcase-frame" />
        <div className="wt-showcase-poster"><Poster title={media.title} originalTitle={media.originalTitle} mediaType={media.type} year={extractYear(media.releaseDate)} image={media.posterPath} favorite={entry.favorite} priority /></div>
        <span className="wt-showcase-stamp">{String(index + 1).padStart(2, '0')}<small>FROM YOUR<br />COLLECTION</small></span>
      </div>
    </div>
    <div className="wt-showcase-footer">
      <div className="wt-showcase-picks" role="group" aria-label="Featured titles">
        {candidates.map((item, candidateIndex) => <button type="button" key={item.mediaItem.id} aria-label={`Feature ${item.mediaItem.title}`} aria-pressed={index === candidateIndex} onClick={() => setSelectedId(item.mediaItem.id)}><span>{String(candidateIndex + 1).padStart(2, '0')}</span><span>{item.mediaItem.title}</span></button>)}
      </div>
      {candidates.length > 1 && <div className="wt-showcase-navigation"><button type="button" aria-label="Previous featured title" onClick={() => select(index - 1)}><ChevronLeft size={16} /></button><span>{index + 1} / {candidates.length}</span><button type="button" aria-label="Next featured title" onClick={() => select(index + 1)}><ChevronRight size={16} /></button></div>}
    </div>
  </section>
}
