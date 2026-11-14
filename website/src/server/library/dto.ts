import type { LibraryEntryDTO, MediaItemDTO } from '@shared/library'
import type { TagDTO } from '@shared/tags'
import type { LibraryEntry, MediaItem, Tag } from '../db/types'

export function toMediaItemDTO(item: MediaItem): MediaItemDTO {
  return {
    id: item.id,
    type: item.type,
    title: item.title,
    originalTitle: item.originalTitle,
    overview: item.overview,
    posterPath: item.posterPath,
    backdropPath: item.backdropPath,
    releaseDate: item.releaseDate,
    airingStatus: item.airingStatus,
    numberOfSeasons: item.numberOfSeasons,
    numberOfEpisodes: item.numberOfEpisodes,
    runtimeMinutes: item.runtimeMinutes,
    genres: item.genres ?? [],
    source: item.source,
    sourceId: item.sourceId
  }
}

export function toLibraryEntryDTO(entry: LibraryEntry): LibraryEntryDTO {
  return {
    id: entry.id,
    mediaItemId: entry.mediaItemId,
    watchStatus: entry.watchStatus,
    rating: entry.rating,
    favorite: entry.favorite,
    notes: entry.notes,
    rewatchCount: entry.rewatchCount,
    addedAt: entry.addedAt,
    startedAt: entry.startedAt,
    completedAt: entry.completedAt
  }
}

export function toTagDTO(tag: Tag): TagDTO {
  return { id: tag.id, name: tag.name, color: tag.color }
}
