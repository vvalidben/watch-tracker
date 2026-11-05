import type { MediaStatus, MediaType, MetadataSource, NormalizedMedia } from './metadata'

export type WatchStatus = 'plan_to_watch' | 'watching' | 'completed' | 'on_hold' | 'dropped'

/**
 * The local, persisted view of a media item — only what was copied in when
 * the title was added to the library. Kept independent of src/main/db's
 * inferred types on purpose: this is the renderer-facing contract, not the
 * schema.
 */
export interface MediaItemDTO {
  id: number
  type: MediaType
  title: string
  originalTitle: string | null
  overview: string | null
  posterPath: string | null
  backdropPath: string | null
  releaseDate: string | null
  airingStatus: MediaStatus | null
  /** Cached from the provider at add-time so the Library page never has to call the API. */
  numberOfSeasons: number | null
  numberOfEpisodes: number | null
  /** Movie runtime in minutes, cached at add-time. Always null for tv/anime — see NormalizedMedia.runtime. */
  runtimeMinutes: number | null
  genres: string[]
  /** 'manual' covers a future hand-entered title with no external match. */
  source: MetadataSource | 'manual'
  sourceId: string | null
}

export interface LibraryEntryDTO {
  id: number
  mediaItemId: number
  watchStatus: WatchStatus
  rating: number | null
  favorite: boolean
  /** Personal note on the movie/series/anime as a whole — separate from any season/episode note. */
  notes: string | null
  rewatchCount: number
  addedAt: string
  startedAt: string | null
  completedAt: string | null
}

/** Sets the personal note on a movie/series/anime as a whole. Pass null to delete it. */
export interface SetNotesRequest extends LibraryActionRequest {
  notes: string | null
}

export interface GetLibraryStateRequest {
  source: MetadataSource
  externalId: string
}

export interface GetLibraryStateResponse {
  mediaItem: MediaItemDTO | null
  libraryEntry: LibraryEntryDTO | null
}

/**
 * Every mutating library request carries the full normalized media the
 * renderer already has in hand (from Search or MediaDetail), so the handler
 * can create the local media_item on first touch without a second fetch —
 * see src/main/library/ensureLocalMedia.ts.
 */
export interface LibraryActionRequest {
  media: NormalizedMedia
}

export type AddToLibraryRequest = LibraryActionRequest
export interface RemoveFromLibraryRequest {
  source: MetadataSource
  externalId: string
}
export interface SetFavoriteRequest extends LibraryActionRequest {
  favorite: boolean
}
export interface SetWatchStatusRequest extends LibraryActionRequest {
  watchStatus: WatchStatus
}
/** Rates the overall movie or series — library_entries.rating, the "My rating" shown against the external score. */
export interface RateMediaRequest extends LibraryActionRequest {
  rating: number | null
}

export interface LibraryStateResult {
  mediaItem: MediaItemDTO
  libraryEntry: LibraryEntryDTO
}

export interface EpisodeProgressDTO {
  watched: boolean
  /** Most recent watch date, kept even after the episode is later marked unwatched. */
  watchedAt: string | null
  rating: number | null
  /** Total number of times this episode has been marked watched (rewatches included). */
  watchCount: number
  /** Personal note on this specific episode. */
  notes: string | null
}

export interface SetEpisodeNotesRequest extends LibraryActionRequest {
  seasonNumber: number
  episodeNumber: number
  notes: string | null
}

/**
 * Every date this title/episode was marked watched, oldest first — e.g.
 * "Episode 5: Watched: 2026-01-10, 2026-06-12." Fetched on demand (not
 * bundled with every progress row) since most episodes are only ever
 * watched once and don't need their full history loaded up front.
 */
export interface GetEpisodeHistoryRequest {
  source: MetadataSource
  externalId: string
  seasonNumber: number
  episodeNumber: number
}

export interface GetEpisodeHistoryResponse {
  history: string[]
}

export interface GetMovieHistoryRequest {
  source: MetadataSource
  externalId: string
}

export interface GetMovieHistoryResponse {
  history: string[]
}

export interface GetEpisodeProgressRequest {
  source: MetadataSource
  externalId: string
  seasonNumber: number
}

export interface GetEpisodeProgressResponse {
  /** Keyed by episode number. An episode with no entry is unwatched/unrated. */
  episodes: Record<number, EpisodeProgressDTO>
}

export interface SetEpisodeWatchedRequest extends LibraryActionRequest {
  seasonNumber: number
  episodeNumber: number
  watched: boolean
}

/** Result of any action that can change watch progress and (in turn) the auto-computed status. */
export interface WatchMutationResult {
  libraryEntry: LibraryEntryDTO
}

export interface SetEpisodeWatchedResult extends WatchMutationResult {
  progress: EpisodeProgressDTO
}

export interface RateEpisodeRequest extends LibraryActionRequest {
  seasonNumber: number
  episodeNumber: number
  rating: number | null
}

export interface SetSeasonWatchedRequest extends LibraryActionRequest {
  seasonNumber: number
  watched: boolean
}

export interface SetSeriesWatchedRequest extends LibraryActionRequest {
  watched: boolean
}

export interface RateSeasonRequest extends LibraryActionRequest {
  seasonNumber: number
  rating: number | null
}

export interface SetSeasonNotesRequest extends LibraryActionRequest {
  seasonNumber: number
  notes: string | null
}

export interface GetSeasonRatingRequest {
  source: MetadataSource
  externalId: string
  seasonNumber: number
}

export interface GetSeasonRatingResponse {
  rating: number | null
  /** Personal note on this season as a whole — separate from any one episode's note. */
  notes: string | null
}

/**
 * Series-wide rating rollups, computed purely from local data (no network
 * involved — unlike SeriesProgressDTO, ratings never depend on the
 * provider). `overallRating` is the same value as LibraryEntryDTO.rating,
 * included here for a single one-stop read when the caller just wants the
 * ratings picture.
 */
export interface SeriesRatingSummaryDTO {
  overallRating: number | null
  /** Average of this series' seasons' own personal ratings (seasons that have one set). */
  averageSeasonRating: number | null
  /** Average of every rated episode across every season. */
  averageEpisodeRating: number | null
}

export interface GetSeriesRatingSummaryRequest {
  source: MetadataSource
  externalId: string
}

export interface GetSeriesRatingSummaryResponse {
  summary: SeriesRatingSummaryDTO | null
}

export interface SeriesProgressDTO {
  watchedEpisodes: number
  totalEpisodes: number
  /** 0-100, rounded. */
  percentage: number
  currentSeasonNumber: number | null
  currentSeasonTotalEpisodes: number | null
  currentEpisodeNumber: number | null
  isFullyWatched: boolean
}

export interface GetSeriesProgressRequest {
  source: MetadataSource
  mediaType: MediaType
  externalId: string
}

export interface GetSeriesProgressResponse {
  /** null for a movie (no episodes to track), or when nothing is known yet. */
  progress: SeriesProgressDTO | null
  error: string | null
}

// ============================================================================
// Library page — listing, filtering, sorting, searching everything the user
// has added. Everything here is answerable from the local database alone.
// ============================================================================

/** Simple watched/total/percentage for a grid card — not the full per-season breakdown MediaDetail shows. */
export interface LibraryItemProgressDTO {
  watchedEpisodes: number
  totalEpisodes: number
  percentage: number
}

export interface LibraryItemDTO {
  mediaItem: MediaItemDTO
  libraryEntry: LibraryEntryDTO
  /** null for a movie, or a show whose episode count isn't cached yet. */
  progress: LibraryItemProgressDTO | null
  /** Most recent episode watchedAt (tv/anime) or completedAt (movie), for the "Recently watched" sort. */
  lastWatchedAt: string | null
}

export type LibraryTypeFilter = 'all' | MediaType
export type LibraryStatusFilter = 'all' | WatchStatus

export type LibrarySortKey =
  | 'recently_added'
  | 'recently_watched'
  | 'alphabetical'
  | 'rating_desc'
  | 'rating_asc'
  | 'release_date'

export interface ListLibraryRequest {
  type?: LibraryTypeFilter
  status?: LibraryStatusFilter
  favoritesOnly?: boolean
  /** Restricts to items tagged with this tag. */
  tagId?: number
  /** Matches against title/originalTitle/romajiTitle, case-insensitive. */
  search?: string
  sort?: LibrarySortKey
}

export interface ListLibraryResponse {
  items: LibraryItemDTO[]
}
