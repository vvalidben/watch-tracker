import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { MediaType, NormalizedMedia, ProviderErrorInfo } from '@shared/metadata'
import { useDebouncedValue } from './useDebouncedValue'
import { getCachedSearch, searchCacheKey, setCachedSearch } from '@renderer/lib/searchResultsCache'

export type MediaTypeFilter = 'all' | MediaType

export const MIN_QUERY_LENGTH = 2
const DEBOUNCE_MS = 400

export type SearchStatus = 'idle' | 'loading' | 'done'

export interface UseMediaSearchResult {
  query: string
  setQuery: (query: string) => void
  typeFilter: MediaTypeFilter
  setTypeFilter: (filter: MediaTypeFilter) => void
  results: NormalizedMedia[]
  errors: ProviderErrorInfo[]
  status: SearchStatus
}

const VALID_TYPE_FILTERS: MediaTypeFilter[] = ['all', 'movie', 'tv', 'anime']

function isMediaTypeFilter(value: string | null): value is MediaTypeFilter {
  return value !== null && (VALID_TYPE_FILTERS as string[]).includes(value)
}

/**
 * Drives the Search page. The query and type filter live in the URL
 * (`?q=...&type=...`), not component state — that's what makes "Back" from
 * a title's details page restore the exact same search: navigating to
 * Details pushes a new history entry on top of the Search URL, so
 * `navigate(-1)` returns to that same `?q=...&type=...` entry and this hook
 * reads the identical state back out of it on remount. It also means
 * browser back/forward and a page refresh behave correctly for free.
 *
 * Typing updates the URL via history *replace* (not push) so keystrokes
 * don't spam new history entries — only leaving the page (e.g. opening a
 * title) creates a real, back-able entry.
 *
 * Debounces typing before issuing a request, and short-circuits entirely via
 * an in-session cache (see lib/searchResultsCache.ts) when returning to a
 * search already performed this session — no redundant network/IPC call,
 * no loading flash.
 */
export function useMediaSearch(): UseMediaSearchResult {
  const [searchParams, setSearchParams] = useSearchParams()

  const query = searchParams.get('q') ?? ''
  const typeParam = searchParams.get('type')
  const typeFilter: MediaTypeFilter = isMediaTypeFilter(typeParam) ? typeParam : 'all'

  function updateParams(next: { query?: string; typeFilter?: MediaTypeFilter }): void {
    const nextQuery = next.query ?? query
    const nextType = next.typeFilter ?? typeFilter

    const params = new URLSearchParams()
    if (nextQuery.length > 0) params.set('q', nextQuery)
    if (nextType !== 'all') params.set('type', nextType)
    setSearchParams(params, { replace: true })
  }

  const setQuery = (next: string): void => updateParams({ query: next })
  const setTypeFilter = (next: MediaTypeFilter): void => updateParams({ typeFilter: next })

  // Lazy initializers so a cache hit on mount (e.g. returning from a title's
  // details page) renders the restored results on the very first paint —
  // no flash of an empty grid while the effect below catches up.
  const initialCacheKey = searchCacheKey(query.trim(), typeFilter)
  const initialCached = query.trim().length >= MIN_QUERY_LENGTH ? getCachedSearch(initialCacheKey) : undefined

  const [results, setResults] = useState<NormalizedMedia[]>(() => initialCached?.results ?? [])
  const [errors, setErrors] = useState<ProviderErrorInfo[]>(() => initialCached?.errors ?? [])
  const [status, setStatus] = useState<SearchStatus>(() =>
    initialCached ? 'done' : query.trim().length >= MIN_QUERY_LENGTH ? 'loading' : 'idle'
  )

  const debouncedQuery = useDebouncedValue(query.trim(), DEBOUNCE_MS)
  const latestRequestId = useRef(0)

  useEffect(() => {
    if (debouncedQuery.length < MIN_QUERY_LENGTH) {
      latestRequestId.current += 1
      setResults([])
      setErrors([])
      setStatus('idle')
      return
    }

    const cacheKey = searchCacheKey(debouncedQuery, typeFilter)
    const cached = getCachedSearch(cacheKey)
    if (cached) {
      latestRequestId.current += 1
      setResults(cached.results)
      setErrors(cached.errors)
      setStatus('done')
      return
    }

    const requestId = ++latestRequestId.current
    setStatus('loading')

    const types = typeFilter === 'all' ? undefined : [typeFilter]

    window.api
      .searchMedia({ query: debouncedQuery, types })
      .then((response) => {
        if (latestRequestId.current !== requestId) return // a newer search superseded this one
        setCachedSearch(cacheKey, { results: response.results, errors: response.errors })
        setResults(response.results)
        setErrors(response.errors)
        setStatus('done')
      })
      .catch((error: unknown) => {
        if (latestRequestId.current !== requestId) return
        setResults([])
        setErrors([
          {
            source: 'tmdb',
            code: 'unknown',
            message: error instanceof Error ? error.message : String(error)
          }
        ])
        setStatus('done')
      })
  }, [debouncedQuery, typeFilter])

  return { query, setQuery, typeFilter, setTypeFilter, results, errors, status }
}
