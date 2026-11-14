import { useRef } from 'react'
import { Heart, Library as LibraryIcon, TriangleAlert } from 'lucide-react'
import { LibraryItemCard } from '@renderer/components/media/LibraryItemCard'
import { LibraryItemRow } from '@renderer/components/media/LibraryItemRow'
import { LibraryShowcase } from '@renderer/components/media/LibraryShowcase'
import { MediaGridSkeleton } from '@renderer/components/media/MediaCardSkeleton'
import { EmptyState } from '@renderer/components/layout/EmptyState'
import { PageTitle } from '@renderer/components/neon/PageTitle'
import { useLibrary } from '@renderer/hooks/useLibrary'
import { useAllTags } from '@renderer/hooks/useAllTags'
import { useStatistics } from '@renderer/hooks/useStatistics'
import { WATCH_STATUSES, watchStatusLabel } from '@renderer/lib/mediaFormatting'
import { cn } from '@renderer/lib/utils'
import { useLibraryView } from '@renderer/lib/libraryView'
import type { LibrarySortKey, LibraryStatusFilter, LibraryTypeFilter } from '@shared/library'

const TYPE_FILTERS: { value: LibraryTypeFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'anime', label: 'Anime' },
  { value: 'tv', label: 'Series' },
  { value: 'movie', label: 'Films' }
]

const SORT_OPTIONS: { value: LibrarySortKey; label: string }[] = [
  { value: 'recently_watched', label: 'Recently watched' },
  { value: 'recently_added', label: 'Recently added' },
  { value: 'alphabetical', label: 'A → Z' },
  { value: 'rating_desc', label: 'Highest rated' },
  { value: 'rating_asc', label: 'Lowest rated' },
  { value: 'release_date', label: 'Release date' }
]

const STATUS_ORDER: LibraryStatusFilter[] = ['all', 'watching', 'completed', 'plan_to_watch', 'on_hold', 'dropped']
const MAX_STAGGERED_ITEMS = 24

/** The full library browser: filtered in SQL, sorted client-side (see shared/librarySort.ts), as a grid or a list. */
export function Library(): JSX.Element {
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
  } = useLibrary({ initialSort: 'recently_watched' })
  const [viewMode, setViewMode] = useLibraryView()
  const collectionRef = useRef<HTMLDivElement>(null)
  const allTags = useAllTags()
  const { statistics } = useStatistics()

  const hasActiveFilters =
    search.trim().length > 0 || type !== 'all' || status !== 'all' || favoritesOnly || tagId !== null
  const total = statistics?.completion.totalInLibrary

  function statusCount(value: LibraryStatusFilter): number | undefined {
    if (!statistics) return undefined
    if (value === 'all') return statistics.completion.totalInLibrary
    return statistics.completion.byStatus.find((entry) => entry.status === value)?.count ?? 0
  }

  return (
    <section className="wt-stack" style={{ gap: 24 }}>
      {!loading && !hasActiveFilters && items.length > 0 ? <LibraryShowcase items={items} total={total ?? items.length} onBrowse={() => {
        const reduced = document.documentElement.dataset.motion !== 'full' ||
          (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
        collectionRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
      }} /> : <PageTitle
        number="02"
        jp="書庫"
        title="Library"
        subtitle={loading ? undefined : total !== undefined ? `${items.length} of ${total} titles` : `${items.length} titles`}
      />}

      <div className="wt-panel wt-rise" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', padding: 14, borderRadius: 18, animationDelay: '80ms' }}>
        <input
          className="wt-input"
          placeholder="Search your library…"
          aria-label="Search your library"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          style={{ flex: 1, minWidth: 200, maxWidth: 300 }}
        />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {TYPE_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              aria-pressed={type === filter.value}
              className={cn('wt-pill', type === filter.value && 'is-on')}
              onClick={() => setType(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <select
          className="wt-select"
          aria-label="Sort"
          value={sort}
          onChange={(event) => setSort(event.target.value as LibrarySortKey)}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div style={{ flex: 1 }} />
        <div className="wt-tab-switch">
          {(['grid', 'gallery', 'list'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={viewMode === mode}
              className={cn('wt-tab', viewMode === mode && 'is-on')}
              onClick={() => setViewMode(mode)}
            >
              {mode === 'grid' ? 'Grid' : mode === 'gallery' ? 'Gallery' : 'List'}
            </button>
          ))}
        </div>
      </div>

      <div className="wt-rise" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', animationDelay: '140ms' }}>
        {STATUS_ORDER.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={status === value}
            className={cn('wt-chip', status === value && 'is-on')}
            onClick={() => setStatus(value)}
          >
            {value === 'all' ? 'All' : watchStatusLabel(value as (typeof WATCH_STATUSES)[number])}
            {statusCount(value) !== undefined && <span className="wt-chip-count">{statusCount(value)}</span>}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={favoritesOnly}
          className={cn('wt-chip', favoritesOnly && 'is-on')}
          onClick={() => setFavoritesOnly(!favoritesOnly)}
        >
          <Heart className="h-3.5 w-3.5" fill={favoritesOnly ? 'currentColor' : 'none'} />
          Favorites
        </button>
        {allTags.length > 0 && (
          <select
            className="wt-select"
            aria-label="Filter by tag"
            style={{ borderRadius: 99, padding: '6px 12px', fontSize: 13 }}
            value={tagId ?? ''}
            onChange={(event) => setTagId(event.target.value === '' ? null : Number(event.target.value))}
          >
            <option value="">All tags</option>
            {allTags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                #{tag.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {error && (
        <div className="wt-error">
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
              : 'Search for a film, series, or anime to add your first title.'
          }
        />
      ) : viewMode !== 'list' ? (
        <div ref={collectionRef} className={cn('wt-library-grid', viewMode === 'gallery' && 'is-gallery')}>
          {items.map((item, index) => (
            <LibraryItemCard key={item.mediaItem.id} item={item} delayMs={Math.min(index, MAX_STAGGERED_ITEMS) * 40} />
          ))}
        </div>
      ) : (
        <div ref={collectionRef} className="wt-stack" style={{ gap: 8 }}>
          {items.map((item, index) => (
            <LibraryItemRow key={item.mediaItem.id} item={item} delayMs={Math.min(index, MAX_STAGGERED_ITEMS) * 40} />
          ))}
        </div>
      )}
    </section>
  )
}
