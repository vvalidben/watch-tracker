import { Bookmark, BookmarkCheck, Check, Heart, Plus } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { Skeleton } from '@renderer/components/ui/skeleton'
import { cn } from '@renderer/lib/utils'
import type { UseLibraryStateResult } from '@renderer/hooks/useLibraryState'

interface LibraryActionsBarProps {
  libraryState: UseLibraryStateResult
}

/**
 * Presentational: takes a `useLibraryState` instance owned by the page
 * (MediaDetail also feeds WatchStatusSelect/MovieWatchedToggle from the same
 * instance, so they can't each own a separate copy of this state).
 */
export function LibraryActionsBar({ libraryState }: LibraryActionsBarProps): JSX.Element {
  const {
    loading,
    pending,
    inLibrary,
    favorite,
    isWatchlisted,
    error,
    addToLibrary,
    removeFromLibrary,
    toggleFavorite,
    addToWatchlist
  } = libraryState

  if (loading) {
    return <Skeleton className="h-9 w-72 rounded-md" />
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={inLibrary ? 'secondary' : 'default'}
          disabled={pending}
          className="gap-1.5"
          onClick={() => void (inLibrary ? removeFromLibrary() : addToLibrary())}
        >
          {inLibrary ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {inLibrary ? 'In Library' : 'Add to Library'}
        </Button>

        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          className={cn('gap-1.5', favorite && 'border-favorite/50 text-favorite hover:text-favorite')}
          onClick={() => void toggleFavorite()}
        >
          <Heart className={cn('h-4 w-4', favorite && 'fill-current')} />
          Favorite
        </Button>

        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          className={cn('gap-1.5', isWatchlisted && 'border-primary text-primary')}
          onClick={() => void addToWatchlist()}
        >
          {isWatchlisted ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
          Watchlist
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
