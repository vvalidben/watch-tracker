import { AtmosphereArtwork } from '@renderer/components/layout/AtmosphereArtwork'
import { useVisualStyle, VISUAL_STYLES } from '@renderer/lib/visualStyle'
import { usePointerSurface } from '@renderer/hooks/usePointerSurface'

interface PageTitleProps {
  number: string
  jp: string
  title: string
  subtitle?: string
}

/** A themed page header with decorative artwork and a single accessible title. */
export function PageTitle({ number, jp, title, subtitle }: PageTitleProps): JSX.Element {
  const style = useVisualStyle()
  const surface = usePointerSurface()
  const atmosphere = VISUAL_STYLES.find((choice) => choice.id === style) ?? VISUAL_STYLES[0]
  return (
    <div className="wt-page-head wt-page-feature wt-rise" {...surface}>
      <span className="wt-feature-grid" aria-hidden="true" />
      <div className="wt-page-feature-copy">
        <span className="wt-feature-eyebrow"><i />YOUR PERSONAL COLLECTION<span>{number} / {atmosphere.name}</span></span>
        <div className="wt-page-feature-heading">
          <span className="wt-page-num" aria-hidden="true">{number}</span>
          <div className="wt-stack" style={{ gap: 6 }}>
            <span className="wt-page-jp wt-jp">{jp}</span>
            <h1 className="wt-h1">{title}</h1>
            {subtitle && <span className="wt-sub">{subtitle}</span>}
          </div>
        </div>
        <span className="wt-feature-caption"><span className="wt-feature-caption-line" aria-hidden="true" />{atmosphere.sample}</span>
      </div>
      <div className="wt-page-feature-art" key={style}><AtmosphereArtwork style={style} /></div>
    </div>
  )
}
