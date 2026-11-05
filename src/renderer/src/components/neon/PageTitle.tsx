interface PageTitleProps {
  number: string
  jp: string
  title: string
  subtitle?: string
}

/** The outlined page number with its Japanese label and heading, used at the top of every screen but the Dashboard. */
export function PageTitle({ number, jp, title, subtitle }: PageTitleProps): JSX.Element {
  return (
    <div className="wt-page-head wt-rise">
      <span className="wt-page-num" aria-hidden="true">
        {number}
      </span>
      <div className="wt-stack" style={{ gap: 6 }}>
        <span className="wt-page-jp wt-jp">{jp}</span>
        <h1 className="wt-h1">{title}</h1>
        {subtitle && <span className="wt-sub">{subtitle}</span>}
      </div>
    </div>
  )
}
