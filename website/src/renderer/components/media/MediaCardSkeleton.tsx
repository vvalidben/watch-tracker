import { Skeleton } from '@renderer/components/ui/skeleton'

export function MediaCardSkeleton(): JSX.Element {
  return (
    <div className="space-y-2.5">
      <Skeleton className="aspect-[2/3] w-full rounded-[14px]" />
      <Skeleton className="h-3.5 w-3/4" />
      <Skeleton className="h-3 w-1/3" />
    </div>
  )
}

/** The loading placeholder for the Library's poster grid. */
export function MediaGridSkeleton({ count = 10 }: { count?: number }): JSX.Element {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: '30px 22px' }}>
      {Array.from({ length: count }).map((_, index) => (
        <MediaCardSkeleton key={index} />
      ))}
    </div>
  )
}
