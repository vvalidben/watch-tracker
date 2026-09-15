import { Skeleton } from '@renderer/components/ui/skeleton'
import { MediaGrid } from '@renderer/components/media/MediaGrid'

export function MediaCardSkeleton(): JSX.Element {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <Skeleton className="aspect-[2/3] w-full rounded-none" />
      <div className="space-y-2 p-3">
        <Skeleton className="h-3.5 w-3/4" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  )
}

/** The shared loading placeholder for every poster grid (Search, Library). */
export function MediaGridSkeleton({ count = 10 }: { count?: number }): JSX.Element {
  return (
    <MediaGrid>
      {Array.from({ length: count }).map((_, index) => (
        <MediaCardSkeleton key={index} />
      ))}
    </MediaGrid>
  )
}
