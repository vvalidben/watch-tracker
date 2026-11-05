import { useEffect, useRef, useState } from 'react'
import { Search as SearchIconOutline, TriangleAlert } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { MediaResultCard } from '@renderer/components/media/MediaResultCard'
import { EmptyState } from '@renderer/components/layout/EmptyState'
import { PageTitle } from '@renderer/components/neon/PageTitle'
import { Skeleton } from '@renderer/components/ui/skeleton'
import { MIN_QUERY_LENGTH, useMediaSearch, type MediaTypeFilter } from '@renderer/hooks/useMediaSearch'
import { registerSearchInput } from '@renderer/lib/searchFocus'
import { cn } from '@renderer/lib/utils'
import type { NormalizedMedia } from '@shared/metadata'

const TYPE_FILTERS: { value: MediaTypeFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'movie', label: 'Films' },
  { value: 'tv', label: 'Series' },
  { value: 'anime', label: 'Anime' }
]

function libraryKey(source: string, externalId: string | null): string {
  return `${source}:${externalId}`
}

export function Search(): JSX.Element {
  const navigate = useNavigate()
  const { query, setQuery, typeFilter, setTypeFilter, results, errors, status } = useMediaSearch()
  const inputRef = useRef<HTMLInputElement>(null)
  const [libraryKeys, setLibraryKeys] = useState<Set<string>>(new Set())
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const [addError, setAddError] = useState<string | null>(null)

  useEffect(() => {
    registerSearchInput(inputRef.current)
    return () => registerSearchInput(null)
  }, [])

  useEffect(() => {
    let cancelled = false
    window.api
      .listLibrary({})
      .then((response) => {
        if (cancelled) return
        setLibraryKeys(new Set(response.items.map((item) => libraryKey(item.mediaItem.source, item.mediaItem.sourceId))))
      })
      .catch((err: unknown) => {
        // Only the "In library" labels depend on this. Adding is still safe,
        // since a title is identified by its source and can't be duplicated.
        console.warn('[search] could not read the library', err)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const trimmedLength = query.trim().length

  function openDetails(media: NormalizedMedia): void {
    navigate(`/media/${media.source}/${media.mediaType}/${media.externalId}`)
  }

  async function addToLibrary(media: NormalizedMedia): Promise<void> {
    const key = libraryKey(media.source, media.externalId)
    setPendingKey(key)
    setAddError(null)
    const result = await window.api.addToLibrary({ media })
    setPendingKey(null)
    if (result.ok) {
      setLibraryKeys((previous) => new Set(previous).add(key))
    } else {
      setAddError(result.error)
    }
  }

  const messages = [...errors.map((error) => error.message), ...(addError ? [addError] : [])]

  return (
    <section className="wt-stack" style={{ gap: 24 }}>
      <PageTitle number="06" jp="追加" title="Add a title" subtitle="Films and series from TMDB, anime from AniList" />

      <div className="wt-rise" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', animationDelay: '80ms' }}>
        <input
          ref={inputRef}
          autoFocus
          className="wt-input-hero"
          aria-label="Search by title"
          placeholder="Search by title…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {TYPE_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              aria-pressed={typeFilter === filter.value}
              className={cn('wt-pill', typeFilter === filter.value && 'is-on')}
              onClick={() => setTypeFilter(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {messages.map((message, index) => (
        <div key={index} className="wt-error">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{message}</span>
        </div>
      ))}

      {status === 'idle' && trimmedLength === 0 && (
        <EmptyState
          icon={SearchIconOutline}
          title="Search for something to watch"
          description="Try a title like “Inception” or “Breaking Bad”."
        />
      )}

      {status === 'idle' && trimmedLength > 0 && trimmedLength < MIN_QUERY_LENGTH && (
        <p className="wt-sub">Keep typing to search…</p>
      )}

      {status === 'loading' && (
        <div className="wt-stack" style={{ gap: 12 }}>
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-[142px] rounded-[20px]" />
          ))}
        </div>
      )}

      {status === 'done' && results.length === 0 && errors.length === 0 && (
        <span style={{ padding: '20px 0', color: 'var(--wt-muted)' }}>No matches. Try a shorter title.</span>
      )}

      {status === 'done' && results.length > 0 && (
        <div className="wt-stack" style={{ gap: 12 }}>
          {results.map((media, index) => {
            const key = libraryKey(media.source, media.externalId)
            return (
              <MediaResultCard
                key={key}
                media={media}
                inLibrary={libraryKeys.has(key)}
                pending={pendingKey === key}
                delayMs={Math.min(index, 24) * 40}
                onSelect={() => openDetails(media)}
                onAdd={() => void addToLibrary(media)}
              />
            )
          })}
        </div>
      )}
    </section>
  )
}
