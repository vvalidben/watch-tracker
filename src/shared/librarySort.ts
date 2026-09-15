import type { LibraryItemDTO, LibrarySortKey } from './library'

/** Nulls always sort to the end, regardless of direction — an unrated item isn't "low", it's just unrated. */
function compareNullableNumber(a: number | null, b: number | null, direction: 'asc' | 'desc'): number {
  if (a === null && b === null) return 0
  if (a === null) return 1
  if (b === null) return -1
  return direction === 'asc' ? a - b : b - a
}

/** ISO date strings compare lexicographically; nulls (never watched/no known release date) sort last. */
function compareNullableDateDesc(a: string | null, b: string | null): number {
  if (a === null && b === null) return 0
  if (a === null) return 1
  if (b === null) return -1
  return b.localeCompare(a)
}

/**
 * Sorts a filtered library list. Returns a new array — never mutates the
 * input. This is where the sorts that can't be expressed as a simple SQL
 * ORDER BY (nulls-last ratings, "recently watched" derived from either
 * episode progress or a movie's completedAt) actually happen; the SQL layer
 * only needs to handle filtering.
 */
export function sortLibraryItems(items: readonly LibraryItemDTO[], sort: LibrarySortKey): LibraryItemDTO[] {
  const copy = [...items]

  switch (sort) {
    case 'recently_added':
      return copy.sort((a, b) => b.libraryEntry.addedAt.localeCompare(a.libraryEntry.addedAt))
    case 'recently_watched':
      return copy.sort((a, b) => compareNullableDateDesc(a.lastWatchedAt, b.lastWatchedAt))
    case 'alphabetical':
      return copy.sort((a, b) => a.mediaItem.title.localeCompare(b.mediaItem.title))
    case 'rating_desc':
      return copy.sort((a, b) => compareNullableNumber(a.libraryEntry.rating, b.libraryEntry.rating, 'desc'))
    case 'rating_asc':
      return copy.sort((a, b) => compareNullableNumber(a.libraryEntry.rating, b.libraryEntry.rating, 'asc'))
    case 'release_date':
      return copy.sort((a, b) => compareNullableDateDesc(a.mediaItem.releaseDate, b.mediaItem.releaseDate))
  }
}
