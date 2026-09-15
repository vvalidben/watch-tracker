import type { MediaStatus, MediaType, MetadataSource } from '@shared/metadata'
import type { WatchStatus } from '@shared/library'

/** "45m" under an hour, "2h 35m" otherwise — a single title's runtime (movies only; see NormalizedMedia.runtime). */
export function formatRuntime(totalMinutes: number): string {
  if (totalMinutes < 60) return `${totalMinutes}m`
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
}

export function extractYear(releaseDate: string | null): string | null {
  if (!releaseDate) return null
  const match = /^\d{4}/.exec(releaseDate)
  return match ? match[0] : null
}

export function mediaTypeLabel(type: MediaType): string {
  switch (type) {
    case 'movie':
      return 'Movie'
    case 'tv':
      return 'TV'
    case 'anime':
      return 'Anime'
  }
}

export function mediaStatusLabel(status: MediaStatus | null): string | null {
  switch (status) {
    case 'airing':
      return 'Airing'
    case 'finished':
      return 'Finished'
    case 'upcoming':
      return 'Upcoming'
    case 'cancelled':
      return 'Cancelled'
    default:
      return null
  }
}

export function sourceRatingLabel(source: MetadataSource): string {
  switch (source) {
    case 'tmdb':
      return 'TMDB Rating'
    case 'anilist':
      return 'AniList Rating'
  }
}

export const WATCH_STATUSES: WatchStatus[] = ['plan_to_watch', 'watching', 'completed', 'on_hold', 'dropped']

export function watchStatusLabel(status: WatchStatus): string {
  switch (status) {
    case 'plan_to_watch':
      return 'Plan to Watch'
    case 'watching':
      return 'Watching'
    case 'completed':
      return 'Completed'
    case 'on_hold':
      return 'On Hold'
    case 'dropped':
      return 'Dropped'
  }
}
