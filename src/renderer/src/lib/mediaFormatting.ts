import type { MediaStatus, MediaType, MetadataSource } from '@shared/metadata'
import type { MediaItemDTO, WatchStatus } from '@shared/library'

export function extractYear(releaseDate: string | null): string | null {
  if (!releaseDate) return null
  const match = /^\d{4}/.exec(releaseDate)
  return match ? match[0] : null
}

export function mediaTypeLabel(type: MediaType): string {
  switch (type) {
    case 'movie':
      return 'Film'
    case 'tv':
      return 'Series'
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

export function sourceName(source: MetadataSource): string {
  switch (source) {
    case 'tmdb':
      return 'TMDB'
    case 'anilist':
      return 'AniList'
  }
}

export const WATCH_STATUSES: WatchStatus[] = ['plan_to_watch', 'watching', 'completed', 'on_hold', 'dropped']

export function watchStatusLabel(status: WatchStatus): string {
  switch (status) {
    case 'plan_to_watch':
      return 'Plan to watch'
    case 'watching':
      return 'Watching'
    case 'completed':
      return 'Completed'
    case 'on_hold':
      return 'On hold'
    case 'dropped':
      return 'Dropped'
  }
}

/** "125 min" for a film, "28 episodes" for a series, or null when the length isn't known. */
export function lengthText(
  type: MediaType,
  runtimeMinutes: number | null | undefined,
  numberOfEpisodes: number | null
): string | null {
  if (type === 'movie') return runtimeMinutes ? `${runtimeMinutes} min` : null
  return numberOfEpisodes ? `${numberOfEpisodes} episodes` : null
}

/** Joins whichever of the given details are known with " · ", dropping the rest. */
export function metaLine(...parts: (string | null | undefined)[]): string {
  return parts.filter(Boolean).join(' · ')
}

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "5 Nov", or an em dash when there's no usable date. */
export function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '—' : `${date.getDate()} ${SHORT_MONTHS[date.getMonth()]}`
}

/** "★ 9.0" or "Unrated". */
export function ratingLabel(rating: number | null): string {
  return rating === null ? 'Unrated' : `★ ${rating.toFixed(1)}`
}

/** The in-app route for a title, or null for a manual entry with no external id to look it up by. */
export function mediaPath(
  media: Pick<MediaItemDTO, 'source' | 'type' | 'sourceId'>
): string | null {
  return media.source === 'manual' || media.sourceId === null ? null : `/media/${media.source}/${media.type}/${media.sourceId}`
}
