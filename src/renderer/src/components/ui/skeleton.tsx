import { cn } from '@renderer/lib/utils'

/** Shimmering placeholder block — the single shared building block for every loading state in the app. */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): JSX.Element {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-md bg-muted',
        'motion-safe:before:absolute motion-safe:before:inset-0 motion-safe:before:-translate-x-full',
        'motion-safe:before:animate-shimmer motion-safe:before:bg-gradient-to-r',
        'motion-safe:before:from-transparent motion-safe:before:via-foreground/10 motion-safe:before:to-transparent',
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
