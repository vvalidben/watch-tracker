import { LibraryItemCard } from '@renderer/components/media/LibraryItemCard'
import { ContinueWatchingCard } from '@renderer/components/dashboard/ContinueWatchingCard'
import type { LibraryItemDTO } from '@shared/library'

interface DashboardShelfProps {
  title: string
  items: LibraryItemDTO[]
  /** 'large' uses ContinueWatchingCard (richer, progress-forward); 'poster' reuses the standard library card. */
  variant?: 'poster' | 'large'
}

/**
 * A horizontally-scrolling preview row. Reuses the exact same card as the
 * Library page — a dashboard shelf is a preview of that data, not a
 * different visual language for it. Hides itself entirely when empty,
 * since an empty section on a "glance" screen is just noise.
 */
export function DashboardShelf({ title, items, variant = 'poster' }: DashboardShelfProps): JSX.Element | null {
  if (items.length === 0) return null

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold tracking-tight text-foreground/90">{title}</h3>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {items.map((item) =>
          variant === 'large' ? (
            <ContinueWatchingCard key={item.mediaItem.id} item={item} />
          ) : (
            <div key={item.mediaItem.id} className="w-36 shrink-0 sm:w-40">
              <LibraryItemCard item={item} />
            </div>
          )
        )}
      </div>
    </section>
  )
}
