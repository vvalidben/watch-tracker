import { useCallback, useEffect, useState } from 'react'
import type { LibraryItemDTO, LibrarySortKey, LibraryStatusFilter, LibraryTypeFilter } from '@shared/library'
import { useDebouncedValue } from './useDebouncedValue'

const SEARCH_DEBOUNCE_MS = 300

export interface UseLibraryOptions {
  initialType?: LibraryTypeFilter
  initialStatus?: LibraryStatusFilter
  initialFavoritesOnly?: boolean
}

export interface UseLibraryResult {
  items: LibraryItemDTO[]
  loading: boolean
  error: string | null
  type: LibraryTypeFilter
  setType: (type: LibraryTypeFilter) => void
  status: LibraryStatusFilter
  setStatus: (status: LibraryStatusFilter) => void
  favoritesOnly: boolean
  setFavoritesOnly: (value: boolean) => void
  /** null = no tag filter. */
  tagId: number | null
  setTagId: (tagId: number | null) => void
  search: string
  setSearch: (value: string) => void
  sort: LibrarySortKey
  setSort: (sort: LibrarySortKey) => void
  refresh: () => Promise<void>
}

/**
 * Drives the Library page. Filtering happens at the SQL level (see
 * src/main/library/libraryView.ts); this hook just debounces the search box
 * and re-fetches whenever any filter/sort changes. Never touches the
 * metadata API — everything it renders comes from the local database.
 */
export function useLibrary(options: UseLibraryOptions = {}): UseLibraryResult {
  const [type, setType] = useState<LibraryTypeFilter>(options.initialType ?? 'all')
  const [status, setStatus] = useState<LibraryStatusFilter>(options.initialStatus ?? 'all')
  const [favoritesOnly, setFavoritesOnly] = useState(options.initialFavoritesOnly ?? false)
  const [tagId, setTagId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<LibrarySortKey>('recently_added')
  const [items, setItems] = useState<LibraryItemDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const debouncedSearch = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS)

  const load = useCallback(async (): Promise<void> => {
    const response = await window.api.listLibrary({
      type,
      status,
      favoritesOnly,
      tagId: tagId ?? undefined,
      search: debouncedSearch.length > 0 ? debouncedSearch : undefined,
      sort
    })
    setItems(response.items)
  }, [type, status, favoritesOnly, tagId, debouncedSearch, sort])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    load()
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [load])

  return {
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
    setSort,
    refresh: load
  }
}
