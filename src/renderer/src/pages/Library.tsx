import { useState } from 'react'
import { Heart, Library as LibraryIcon, TriangleAlert } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { MediaTypeFilterBar } from '@renderer/components/media/MediaTypeFilterBar'
import { LibraryStatusFilterBar } from '@renderer/components/media/LibraryStatusFilterBar'
import { LibraryTagFilterBar } from '@renderer/components/media/LibraryTagFilterBar'
import { LibrarySortSelect } from '@renderer/components/media/LibrarySortSelect'
import { LibraryViewToggle, type LibraryViewMode } from '@renderer/components/media/LibraryViewToggle'
import { LibraryItemCard } from '@renderer/components/media/LibraryItemCard'
import { LibraryItemRow } from '@renderer/components/media/LibraryItemRow'
import { MediaGrid } from '@renderer/components/media/MediaGrid'
import { MediaGridSkeleton } from '@renderer/components/media/MediaCardSkeleton'
import { SearchBar } from '@renderer/components/media/SearchBar'
import { EmptyState } from '@renderer/components/layout/EmptyState'
import { PageHeader } from '@renderer/components/layout/PageHeader'
import { useLibrary, type UseLibraryOptions } from '@renderer/hooks/useLibrary'
import { useAllTags } from '@renderer/hooks/useAllTags'
import { cn } from '@renderer/lib/utils'

interface LibraryProps {
  initialOptions?: UseLibraryOptions
  title?: string
  description?: string
}

/**
 * The full library browser: SQL-filtered (type/status/favorite/search),
 * client-sorted (see shared/librarySort.ts), grid or list. `initialOptions`
 * lets the sidebar's Watching/Completed/Watchlist links reuse this exact
 * page pre-filtered rather than duplicating it.
 */
export function Library({ initialOptions, title, description }: LibraryProps): JSX.Element {
  const {
    items,
    loading,
    error,
    type,
    setType,
    status,
    setStatus,
    favoritesOnly,
    setFavoritesOnly,
    tagId,
    setTagId,
    search,
    setSearch,
    sort,
    setSort
  } = useLibrary(initialOptions)
  const [viewMode, setViewMode] = useState<LibraryViewMode>('grid')
  const allTags = useAllTags()

  const hasActiveFilters =
    search.trim().length > 0 || type !== 'all' || status !== 'all' || favoritesOnly || tagId !== null

  return (
    <div className="space-y-6">
      <PageHeader
        icon={LibraryIcon}
        title={title ?? 'Library'}
        description={description ?? 'Everything you track, all in one place.'}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <SearchBar value={search} onChange={setSearch} placeholder="Search your library…" className="max-w-xs flex-1" />
        <div className="flex items-center gap-2">
          <LibrarySortSelect value={sort} onChange={setSort} />
          <LibraryViewToggle value={viewMode} onChange={setViewMode} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <MediaTypeFilterBar value={type} onChange={setType} />
        <div className="h-5 w-px bg-border" />
        <LibraryStatusFilterBar value={status} onChange={setStatus} />
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={cn(
            'gap-1.5 rounded-full',
            favoritesOnly && 'border-favorite/50 text-favorite hover:text-favorite'
          )}
          onClick={() => setFavoritesOnly(!favoritesOnly)}
        >
          <Heart className={cn('h-4 w-4', favoritesOnly && 'fill-current')} />
          Favorites
        </Button>
        <LibraryTagFilterBar tags={allTags} value={tagId} onChange={setTagId} />
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <MediaGridSkeleton />
      ) : items.length === 0 ? (
        <EmptyState
          icon={LibraryIcon}
          title={hasActiveFilters ? 'No titles match these filters' : 'Your library is empty'}
          description={
            hasActiveFilters
              ? 'Try adjusting or clearing your filters.'
              : 'Search for a movie, series, or anime to add your first title.'
          }
        />
      ) : viewMode === 'grid' ? (
        <MediaGrid>
          {items.map((item) => (
            <LibraryItemCard key={item.mediaItem.id} item={item} />
          ))}
        </MediaGrid>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <LibraryItemRow key={item.mediaItem.id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}
