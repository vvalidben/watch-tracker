import type { LucideIcon } from 'lucide-react'
import { cn } from '@renderer/lib/utils'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

/** The single shared "nothing here yet" layout — used by every list/grid/section in the app. */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps): JSX.Element {
  return (
    <div
      className={cn(
        'flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-[22px] border-2 border-dashed border-border bg-card/40 px-6 py-16 text-center',
        className
      )}
    >
      {Icon && (
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon className="h-5 w-5" />
        </span>
      )}
      <div className="space-y-1">
        <p className="wt-display text-xl text-foreground">{title}</p>
        {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  )
}
