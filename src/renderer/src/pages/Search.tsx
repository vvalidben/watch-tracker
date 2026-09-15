import { useEffect, useRef } from 'react'
import { Search as SearchIconOutline, TriangleAlert } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { MediaResultCard } from '@renderer/components/media/MediaResultCard'
import { MediaTypeFilterBar } from '@renderer/components/media/MediaTypeFilterBar'
import { MediaGrid } from '@renderer/components/media/MediaGrid'
import { MediaGridSkeleton } from '@renderer/components/media/MediaCardSkeleton'
import { SearchBar } from '@renderer/components/media/SearchBar'
import { EmptyState } from '@renderer/components/layout/EmptyState'
import { PageHeader } from '@renderer/components/layout/PageHeader'
import { MIN_QUERY_LENGTH, useMediaSearch } from '@renderer/hooks/useMediaSearch'
import { registerSearchInput } from '@renderer/lib/searchFocus'
import type { NormalizedMedia } from '@shared/metadata'

export function Search(): JSX.Element {
  const navigate = useNavigate()
  const { query, setQuery, typeFilter, setTypeFilter, results, errors, status } = useMediaSearch()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    registerSearchInput(inputRef.current)
    return () => registerSearchInput(null)
  }, [])

  const trimmedLength = query.trim().length
  const openDetails = (media: NormalizedMedia): void => {
    navigate(`/media/${media.source}/${media.mediaType}/${media.externalId}`)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Search" description="Find a movie, TV series, or anime to add to your library." />

      <div className="space-y-3">
        <SearchBar
          ref={inputRef}
          size="lg"
          autoFocus
          value={query}
          onChange={setQuery}
          placeholder="Search movies, TV series, or anime…"
          className="max-w-xl"
        />
        <MediaTypeFilterBar value={typeFilter} onChange={setTypeFilter} />
      </div>

      {errors.length > 0 && (
        <div className="space-y-2">
          {errors.map((error, index) => (
            <div
              key={`${error.source}-${index}`}
              className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error.message}</span>
            </div>
          ))}
        </div>
      )}

      {status === 'idle' && trimmedLength === 0 && (
        <EmptyState
          icon={SearchIconOutline}
          title="Search for something to watch"
          description="Try a title like “Inception” or “Breaking Bad” — results come from TMDB and AniList."
        />
      )}

      {status === 'idle' && trimmedLength > 0 && trimmedLength < MIN_QUERY_LENGTH && (
        <p className="text-sm text-muted-foreground">Keep typing to search…</p>
      )}

      {status === 'loading' && <MediaGridSkeleton />}

      {status === 'done' && results.length === 0 && (
        <EmptyState
          icon={SearchIconOutline}
          title="No results found"
          description={`Nothing matched “${query.trim()}”. Check the spelling or try a different title.`}
        />
      )}

      {status === 'done' && results.length > 0 && (
        <MediaGrid>
          {results.map((media) => (
            <MediaResultCard
              key={`${media.source}-${media.externalId}`}
              media={media}
              onSelect={() => openDetails(media)}
            />
          ))}
        </MediaGrid>
      )}
    </div>
  )
}
