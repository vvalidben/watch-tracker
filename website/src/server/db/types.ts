import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import {
  episodeProgress,
  episodes,
  libraryEntries,
  mediaItems,
  seasonRatings,
  seasons,
  tags,
  watchEvents
} from './schema'

export type MediaItem = InferSelectModel<typeof mediaItems>
export type NewMediaItem = InferInsertModel<typeof mediaItems>

export type Season = InferSelectModel<typeof seasons>
export type NewSeason = InferInsertModel<typeof seasons>

export type Episode = InferSelectModel<typeof episodes>
export type NewEpisode = InferInsertModel<typeof episodes>

export type LibraryEntry = InferSelectModel<typeof libraryEntries>
export type NewLibraryEntry = InferInsertModel<typeof libraryEntries>

export type EpisodeProgress = InferSelectModel<typeof episodeProgress>
export type NewEpisodeProgress = InferInsertModel<typeof episodeProgress>

export type SeasonRating = InferSelectModel<typeof seasonRatings>
export type NewSeasonRating = InferInsertModel<typeof seasonRatings>

export type WatchEvent = InferSelectModel<typeof watchEvents>
export type NewWatchEvent = InferInsertModel<typeof watchEvents>

export type Tag = InferSelectModel<typeof tags>
export type NewTag = InferInsertModel<typeof tags>

export type MediaType = MediaItem['type']
export type MediaSource = MediaItem['source']
export type AiringStatus = NonNullable<MediaItem['airingStatus']>
export type WatchStatus = LibraryEntry['watchStatus']

export const MEDIA_TYPES: readonly MediaType[] = ['movie', 'tv', 'anime']
export const WATCH_STATUSES: readonly WatchStatus[] = [
  'plan_to_watch',
  'watching',
  'completed',
  'on_hold',
  'dropped'
]

export interface LibraryEntryWithMedia extends LibraryEntry {
  mediaItem: MediaItem
}

export interface SeasonWithEpisodes extends Season {
  episodes: Episode[]
  seasonRating: SeasonRating | null
}

export interface EpisodeWithProgress extends Episode {
  progress: EpisodeProgress | null
}
