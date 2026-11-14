import type { MediaType, MetadataSource, NormalizedMedia } from './metadata'

export interface MediaIdentity {
  source: MetadataSource
  mediaType: MediaType
  externalId: string
}

export interface RefreshMetadataResult {
  media: NormalizedMedia
  episodesCached: number
  warnings: string[]
}

export interface UpcomingEpisode extends MediaIdentity {
  title: string
  seasonNumber: number
  episodeNumber: number
  episodeTitle: string | null
  airDate: string
  available: boolean
}

export interface LogWatchRequest extends MediaIdentity {
  watchedAt: string
  seasonNumber?: number
  episodeNumber?: number
}

export interface EditWatchDateRequest {
  eventId: number
  watchedAt: string
}

export interface AutomaticBackupDTO {
  name: string
  createdAt: string
  sizeBytes: number
}

export type ImportDuplicateMode = 'skip' | 'merge'
export interface CsvImportRow {
  line: number
  title: string
  source: MetadataSource
  mediaType: MediaType
  externalId: string
  watchStatus: 'plan_to_watch' | 'watching' | 'completed' | 'on_hold' | 'dropped'
  rating: number | null
  notes: string | null
  favorite: boolean
  watchedAt: string | null
}
export interface ImportPreviewRow extends CsvImportRow {
  duplicate: boolean
  error: string | null
}
export interface ImportPreview {
  token: string
  fileName: string
  columns?: string[]
  rows: ImportPreviewRow[]
}
export interface ImportResult {
  imported: number
  merged: number
  skipped: number
  errors: string[]
}
