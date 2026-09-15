import type { LucideIcon } from 'lucide-react'
import { cn } from '@renderer/lib/utils'

interface PageHeaderProps {
  title: string
  description?: string
  icon?: LucideIcon
  actions?: React.ReactNode
  className?: string
}

/** The consistent title+description+actions row used at the top of a page's content. */
export function PageHeader({ title, description, icon: Icon, actions, className }: PageHeaderProps): JSX.Element {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-4', className)}>
      <div className="flex items-start gap-3">
        {Icon && (
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
            <Icon className="h-5 w-5" />
          </span>
        )}
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight text-balance">{title}</h2>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}
