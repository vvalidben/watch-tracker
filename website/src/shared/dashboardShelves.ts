import { sortLibraryItems } from './librarySort'
import type { LibraryItemDTO } from './library'

export interface DashboardShelves {
  continueWatching: LibraryItemDTO[]
  recentlyWatched: LibraryItemDTO[]
  recentlyAdded: LibraryItemDTO[]
  favorites: LibraryItemDTO[]
  highestRated: LibraryItemDTO[]
  watchlist: LibraryItemDTO[]
}

/**
 * Slices the full library into the dashboard's shelves. Each shelf is a
 * filter + the same sort logic the Library page uses, capped to `limit`
 * items — a shelf is a preview, not a substitute for the full page.
 *
 * "Watching progress" isn't a separate shelf: Continue Watching's cards
 * already carry a progress bar and "watched/total · %" caption (see
 * LibraryItemCard), so a second progress-focused section would just repeat
 * the same titles with the same numbers — exactly the redundancy a
 * dashboard should avoid.
 */
export function buildDashboardShelves(items: readonly LibraryItemDTO[], limit: number): DashboardShelves {
  const continueWatching = sortLibraryItems(
    items.filter((item) => item.libraryEntry.watchStatus === 'watching'),
    'recently_watched'
  ).slice(0, limit)

  const recentlyWatched = sortLibraryItems(
    items.filter((item) => item.lastWatchedAt !== null),
    'recently_watched'
  ).slice(0, limit)

  const recentlyAdded = sortLibraryItems(items, 'recently_added').slice(0, limit)

  const favorites = sortLibraryItems(
    items.filter((item) => item.libraryEntry.favorite),
    'recently_added'
  ).slice(0, limit)

  const highestRated = sortLibraryItems(
    items.filter((item) => item.libraryEntry.rating !== null),
    'rating_desc'
  ).slice(0, limit)

  const watchlist = sortLibraryItems(
    items.filter((item) => item.libraryEntry.watchStatus === 'plan_to_watch'),
    'recently_added'
  ).slice(0, limit)

  return { continueWatching, recentlyWatched, recentlyAdded, favorites, highestRated, watchlist }
}
