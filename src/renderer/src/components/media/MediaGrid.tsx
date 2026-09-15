import { cn } from '@renderer/lib/utils'

interface MediaGridProps {
  children: React.ReactNode
  className?: string
}

/** The single shared poster-grid layout — responsive column count, consistent gap. */
export function MediaGrid({ children, className }: MediaGridProps): JSX.Element {
  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6',
        className
      )}
    >
      {children}
    </div>
  )
}
